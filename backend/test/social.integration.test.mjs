import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

const { Pool } = pg;
const origin = process.env.TRIBES_TEST_ORIGIN;
const mailhogApi = process.env.MAILHOG_API_URL;
const integrationTest = origin && mailhogApi ? test : test.skip;

integrationTest("authenticated social feed, event attendance, likes, comments and cursor pagination", async (t) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const marker = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userIds = [];
  const tribeIds = [];

  async function call(actor, path, options = {}) {
    const response = await fetch(`${origin}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(actor ? { Cookie: actor.cookie } : {}),
        ...options.headers,
      },
    });
    const data = await response.json();
    return { response, data };
  }

  async function register(label) {
    const email = `${marker}-${label}@example.test`;
    const { response: requestResponse, data: requestData } = await call(null, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert.equal(requestResponse.status, 202, JSON.stringify(requestData));
    assert.equal((await pool.query("SELECT 1 FROM users WHERE email = $1", [email])).rowCount, 0);

    let registrationLink;
    for (let attempt = 0; attempt < 20 && !registrationLink; attempt += 1) {
      const search = await fetch(`${mailhogApi}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`);
      const messages = await search.json();
      const body = (messages.items?.[0]?.MIME?.Parts ?? [])
        .map((part) => part.Body)
        .join("\n")
        .replace(/=\r?\n/g, "")
        .replace(/=([0-9a-f]{2})/gi, (_, byte) => String.fromCharCode(Number.parseInt(byte, 16)));
      const match = body.match(/https?:\/\/[^\s<"]+\/cadastro\/confirmar\?token=[^\s<"]+/);
      if (match) registrationLink = match[0];
      else await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(registrationLink, "MailHog deve receber o link de cadastro");
    const token = new URL(registrationLink).searchParams.get("token");
    assert.ok(token);
    const { response, data } = await call(null, "/api/auth/register/complete", {
      method: "POST",
      body: JSON.stringify({ name: `Tester ${label}`, token, password: "integration-test-password" }),
    });
    assert.equal(response.status, 201, JSON.stringify(data));
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    userIds.push(data.user.id);
    return { cookie, user: data.user, token };
  }

  async function createTribe(actor, label) {
    const { response, data } = await call(actor, "/api/tribes", {
      method: "POST",
      body: JSON.stringify({
        name: `${marker} ${label}`,
        description: "Tribo criada pelo teste de integração.",
        category: "Games",
        format: "Online",
        city: "Belo Horizonte",
        neighborhood: "",
      }),
    });
    assert.equal(response.status, 201, JSON.stringify(data));
    tribeIds.push(data.tribe.id);
    return data.tribe;
  }

  async function createPost(actor, tribe, body, image) {
    const { response, data } = await call(actor, `/api/tribes/${tribe.id}/posts`, {
      method: "POST",
      body: JSON.stringify({ body, ...(image ? { image } : {}) }),
    });
    assert.equal(response.status, 201, JSON.stringify(data));
    return data.id;
  }

  t.after(async () => {
    if (tribeIds.length) await pool.query("DELETE FROM tribes WHERE id = ANY($1::uuid[])", [tribeIds]);
    if (userIds.length) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM registration_tokens WHERE email LIKE $1", [`${marker}-%`]);
    await pool.end();
  });

  const alice = await register("alice");
  const resetRequest = await call(null, "/api/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email: "not-registered@example.test" }),
    headers: { "x-forwarded-for": "203.0.113.1" },
  });
  assert.equal(resetRequest.response.status, 404);
  assert.equal(resetRequest.data.error, "Este e-mail não está cadastrado.");

  const { response: resetRequestResponse } = await call(null, "/api/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email: alice.user.email }),
  });
  assert.equal(resetRequestResponse.status, 202);
  let resetLink;
  for (let attempt = 0; attempt < 20 && !resetLink; attempt += 1) {
    const search = await fetch(`${mailhogApi}/api/v2/search?kind=to&query=${encodeURIComponent(alice.user.email)}`);
    const messages = await search.json();
    const body = (messages.items ?? [])
      .flatMap((message) => message.MIME?.Parts ?? [])
      .map((part) => part.Body)
      .join("\n")
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9a-f]{2})/gi, (_, byte) => String.fromCharCode(Number.parseInt(byte, 16)));
    const match = body.match(/https?:\/\/[^\s<"]+\/senha\/redefinir\?token=[^\s<"]+/);
    if (match) resetLink = match[0];
    else await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(resetLink, "MailHog deve receber o link de redefinição de senha");
  const resetToken = new URL(resetLink).searchParams.get("token");
  const { response: resetResponse, data: resetData } = await call(null, "/api/auth/password-reset/complete", {
    method: "POST",
    body: JSON.stringify({ token: resetToken, password: "new-integration-test-password" }),
  });
  assert.equal(resetResponse.status, 200, JSON.stringify(resetData));
  assert.equal(resetData.user.id, alice.user.id);
  const resetCookie = resetResponse.headers.get("set-cookie")?.split(";")[0];
  assert.ok(resetCookie);
  assert.equal((await call(alice, "/api/auth/me")).data.user, null);
  const resetSession = { cookie: resetCookie, user: alice.user };
  assert.equal((await call(resetSession, "/api/auth/me")).data.user.id, alice.user.id);
  assert.equal((await call(null, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: alice.user.email, password: "integration-test-password" }),
  })).response.status, 401);
  alice.cookie = resetCookie;

  const reusedToken = await call(null, "/api/auth/register/complete", {
    method: "POST",
    body: JSON.stringify({ name: "Tester alice", token: alice.token, password: "another-valid-password" }),
  });
  assert.equal(reusedToken.response.status, 400);
  const bob = await register("bob");
  const empty = await register("empty");

  const profileImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmL8AAAAASUVORK5CYII=";
  const profileUpdate = await call(alice, "/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ name: "Alice Perfil", aboutMe: "Gosto de jogos e comunidades.", avatar: profileImage }),
  });
  assert.equal(profileUpdate.response.status, 200, JSON.stringify(profileUpdate.data));
  assert.equal(profileUpdate.data.user.name, "Alice Perfil");
  assert.equal(profileUpdate.data.user.aboutMe, "Gosto de jogos e comunidades.");
  assert.equal(profileUpdate.data.user.avatarUrl, `/api/users/${alice.user.id}/avatar`);
  const currentProfile = await call(alice, "/api/auth/me");
  assert.equal(currentProfile.data.user.name, "Alice Perfil");
  assert.equal(currentProfile.data.user.avatarUrl, `/api/users/${alice.user.id}/avatar`);
  const publicProfile = await call(bob, `/api/users/${alice.user.id}/profile`);
  assert.equal(publicProfile.response.status, 200);
  assert.deepEqual(publicProfile.data.profile, {
    id: alice.user.id,
    name: "Alice Perfil",
    aboutMe: "Gosto de jogos e comunidades.",
    avatarUrl: `/api/users/${alice.user.id}/avatar`,
  });
  assert.equal("email" in publicProfile.data.profile, false);
  const publicAvatar = await fetch(`${origin}/api/users/${alice.user.id}/avatar`, { headers: { Cookie: bob.cookie } });
  assert.equal(publicAvatar.status, 200);
  assert.equal(publicAvatar.headers.get("content-type"), "image/png");
  assert.equal((await publicAvatar.arrayBuffer()).byteLength, Buffer.from(profileImage.split(",")[1], "base64").length);
  const removedAvatar = await call(alice, "/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ name: "Alice Perfil", aboutMe: "Gosto de jogos e comunidades.", avatar: null }),
  });
  assert.equal(removedAvatar.response.status, 200);
  assert.equal(removedAvatar.data.user.avatarUrl, null);
  assert.equal((await call(bob, `/api/users/${alice.user.id}/avatar`)).response.status, 404);
  assert.equal((await call(null, "/api/profile", { method: "PATCH", body: JSON.stringify({ name: "Hacker", aboutMe: "" }) })).response.status, 401);
  assert.equal((await call(alice, "/api/profile", {
    method: "PATCH", body: JSON.stringify({ name: "A", aboutMe: "" }),
  })).response.status, 400);
  assert.equal((await call(alice, "/api/profile", {
    method: "PATCH", body: JSON.stringify({ name: "Alice Perfil", aboutMe: "x".repeat(501) }),
  })).response.status, 400);

  assert.equal((await call(null, "/api/feed")).response.status, 401);
  assert.deepEqual((await call(empty, "/api/tribes?mine=true")).data.tribes, []);
  const tribeOne = await createTribe(alice, "one");
  const tribeTwo = await createTribe(alice, "two");
  const outsiderTribe = await createTribe(bob, "private-to-bob");

  const { response: loginResponse, data: loginData } = await call(null, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: alice.user.email, password: "new-integration-test-password" }),
  });
  assert.equal(loginResponse.status, 200);
  assert.equal(loginData.user.id, alice.user.id);
  const { response: badLogin } = await call(null, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: alice.user.email, password: "wrong-password" }),
  });
  assert.equal(badLogin.status, 401);

  assert.equal((await call(bob, `/api/tribes/${tribeOne.id}/join`, { method: "POST" })).response.status, 200);
  assert.equal((await call(bob, `/api/tribes/${tribeOne.id}/join`, { method: "POST" })).response.status, 200);

  const postId = await createPost(alice, tribeOne, "Uma publicação para todos os membros.");
  const imageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmL8AAAAASUVORK5CYII=";
  const imagePostId = await createPost(alice, tribeOne, "Publicação com imagem.", imageData);
  const invalidImage = await call(alice, `/api/tribes/${tribeOne.id}/posts`, {
    method: "POST",
    body: JSON.stringify({ body: "Imagem inválida.", image: "data:image/png;base64,ZmFrZQ==" }),
  });
  assert.equal(invalidImage.response.status, 400);
  const imageResponse = await fetch(`${origin}/api/content/${imagePostId}/image`, { headers: { Cookie: alice.cookie } });
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/png");
  assert.equal((await imageResponse.arrayBuffer()).byteLength, Buffer.from(imageData.split(",")[1], "base64").length);
  assert.equal((await fetch(`${origin}/api/content/${imagePostId}/image`, { headers: { Cookie: bob.cookie } })).status, 200);
  assert.equal((await call(empty, `/api/content/${imagePostId}/image`)).response.status, 404);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const eventResponse = await call(alice, `/api/tribes/${tribeOne.id}/events`, {
    method: "POST",
    body: JSON.stringify({
      body: "Vamos nos encontrar para jogar.",
      title: "Noite de jogos",
      startsAt: "2027-01-15T19:00:00.000Z",
      endsAt: "2027-01-15T22:00:00.000Z",
      location: "Centro de Belo Horizonte",
      cost: "Gratuito",
      maxAttendees: 1,
    }),
  });
  assert.equal(eventResponse.response.status, 201, JSON.stringify(eventResponse.data));
  const eventId = eventResponse.data.id;
  await new Promise((resolve) => setTimeout(resolve, 10));
  const postTwoId = await createPost(alice, tribeTwo, "Publicação da segunda tribo.");
  for (let index = 0; index < 23; index += 1) {
    await createPost(alice, tribeOne, `Publicação paginada ${index + 1}`);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  const feed = await call(alice, "/api/feed?limit=50");
  assert.equal(feed.response.status, 200);
  assert.deepEqual(new Set(feed.data.items.map((item) => item.tribe.id)), new Set([tribeOne.id, tribeTwo.id]));
  assert.deepEqual(new Set(feed.data.items.map((item) => item.type)), new Set(["post", "event"]));
  const eventInFeed = feed.data.items.find((item) => item.id === eventId);
  assert.equal(feed.data.items.find((item) => item.id === imagePostId).imageUrl, `/api/content/${imagePostId}/image`);
  assert.equal(eventInFeed.event.title, "Noite de jogos");
  assert.equal(eventInFeed.event.location, "Centro de Belo Horizonte");
  for (let index = 1; index < feed.data.items.length; index += 1) {
    assert.ok(new Date(feed.data.items[index - 1].createdAt) >= new Date(feed.data.items[index].createdAt));
  }
  assert.ok(feed.data.items.findIndex((item) => item.id === postTwoId) < feed.data.items.findIndex((item) => item.id === eventId));
  assert.ok(feed.data.items.findIndex((item) => item.id === eventId) < feed.data.items.findIndex((item) => item.id === postId));

  const filtered = await call(alice, `/api/feed?tribeId=${tribeOne.id}&limit=50`);
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.data.items.length >= 2);
  assert.ok(filtered.data.items.every((item) => item.tribe.id === tribeOne.id));
  const forbidden = await call(alice, `/api/feed?tribeId=${outsiderTribe.id}`);
  assert.equal(forbidden.response.status, 403);

  const emptyFeed = await call(empty, "/api/feed");
  assert.equal(emptyFeed.response.status, 200);
  assert.deepEqual(emptyFeed.data, { items: [], nextCursor: null });

  const likePath = `/api/content/${eventId}/like`;
  assert.equal((await call(bob, likePath, { method: "POST" })).response.status, 200);
  assert.deepEqual((await call(bob, likePath, { method: "POST" })).data, { likesCount: 1, likedByMe: true });
  assert.deepEqual((await call(alice, likePath, { method: "POST" })).data, { likesCount: 2, likedByMe: true });
  assert.deepEqual((await call(bob, likePath, { method: "DELETE" })).data, { likesCount: 1, likedByMe: false });
  assert.equal((await call(empty, likePath, { method: "POST" })).response.status, 404);

  const attendancePath = `/api/content/${eventId}/attendance`;
  assert.deepEqual((await call(bob, attendancePath, { method: "POST" })).data, { attendeesCount: 1, attendingByMe: true });
  assert.deepEqual((await call(bob, attendancePath, { method: "POST" })).data, { attendeesCount: 1, attendingByMe: true });
  assert.deepEqual((await call(alice, attendancePath, { method: "POST" })).data, { attendeesCount: 2, attendingByMe: true });
  assert.deepEqual((await call(bob, attendancePath, { method: "DELETE" })).data, { attendeesCount: 1, attendingByMe: false });
  assert.equal((await call(empty, attendancePath, { method: "POST" })).response.status, 404);
  assert.equal((await call(alice, `/api/content/${postId}/attendance`, { method: "POST" })).response.status, 404);
  const feedWithAttendance = await call(alice, `/api/feed?tribeId=${tribeOne.id}&limit=50`);
  const eventWithAttendance = feedWithAttendance.data.items.find((item) => item.id === eventId);
  assert.equal(eventWithAttendance.event.attendeesCount, 1);
  assert.equal(eventWithAttendance.event.attendingByMe, true);
  const bobFeedWithAttendance = await call(bob, `/api/feed?tribeId=${tribeOne.id}&limit=50`);
  assert.equal(bobFeedWithAttendance.data.items.find((item) => item.id === eventId).event.attendingByMe, false);
  assert.equal(feedWithAttendance.data.items.find((item) => item.id === postId).event, null);

  const commentsPath = `/api/content/${eventId}/comments`;
  const createdComment = await call(bob, commentsPath, { method: "POST", body: JSON.stringify({ body: "Vou participar!" }) });
  assert.equal(createdComment.response.status, 201);
  assert.equal(createdComment.data.comment.author.id, bob.user.id);
  assert.ok(createdComment.data.comment.createdAt);
  const listed = await call(alice, commentsPath);
  assert.equal(listed.data.comments.length, 1);
  assert.equal(listed.data.comments[0].body, "Vou participar!");
  const feedWithComment = await call(alice, `/api/feed?tribeId=${tribeOne.id}&limit=50`);
  assert.equal(feedWithComment.data.items.find((item) => item.id === eventId).commentsCount, 1);
  const unauthorizedEdit = await call(alice, `/api/comments/${createdComment.data.comment.id}`, {
    method: "PATCH", body: JSON.stringify({ body: "Tentativa de editar comentário alheio" }),
  });
  assert.equal(unauthorizedEdit.response.status, 404);
  assert.equal((await call(bob, `/api/comments/${createdComment.data.comment.id}`, {
    method: "PATCH", body: JSON.stringify({ body: "Comentário atualizado" }),
  })).response.status, 200);
  assert.equal((await call(bob, `/api/comments/${createdComment.data.comment.id}`, { method: "DELETE" })).response.status, 200);
  const interactedFeed = await call(alice, `/api/feed?tribeId=${tribeOne.id}&limit=50`);
  const interactedEvent = interactedFeed.data.items.find((item) => item.id === eventId);
  assert.equal(interactedEvent.likesCount, 1);
  assert.equal(interactedEvent.commentsCount, 0);

  const paginatedIds = [];
  let cursor = null;
  do {
    const params = new URLSearchParams({ tribeId: tribeOne.id, limit: "10" });
    if (cursor) params.set("cursor", cursor);
    const page = await call(alice, `/api/feed?${params}`);
    assert.equal(page.response.status, 200);
    assert.ok(page.data.items.every((item) => item.tribe.id === tribeOne.id));
    paginatedIds.push(...page.data.items.map((item) => item.id));
    cursor = page.data.nextCursor;
  } while (cursor);
  assert.equal(new Set(paginatedIds).size, paginatedIds.length);
  assert.ok(paginatedIds.length >= 25);

  const left = await call(bob, `/api/tribes/${tribeOne.id}/membership`, { method: "DELETE" });
  assert.equal(left.response.status, 200);
  assert.equal((await call(bob, `/api/feed?tribeId=${tribeOne.id}`)).response.status, 403);
  assert.equal((await call(bob, `/api/content/${imagePostId}/image`)).response.status, 404);
  assert.equal((await call(bob, `/api/tribes/${tribeOne.id}/posts`, {
    method: "POST", body: JSON.stringify({ body: "Sem participação" }),
  })).response.status, 403);
  assert.equal((await call(alice, "/api/tribes?q=Games")).response.status, 200);
  assert.equal((await call(bob, "/api/auth/logout", { method: "POST" })).response.status, 200);
  assert.equal((await call(bob, "/api/auth/me")).data.user, null);
});
