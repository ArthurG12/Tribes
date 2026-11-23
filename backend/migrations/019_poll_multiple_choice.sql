ALTER TABLE feed_items
  ADD COLUMN IF NOT EXISTS poll_multiple BOOLEAN NOT NULL DEFAULT FALSE;

-- Antes: um voto por pessoa por enquete. Agora a chave é (opção, pessoa),
-- e a regra de voto único continua sendo aplicada na aplicação para enquetes
-- que não permitem múltiplas respostas.
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_pkey;
ALTER TABLE poll_votes ADD PRIMARY KEY (option_id, user_id);
CREATE INDEX IF NOT EXISTS poll_votes_content_user_idx ON poll_votes (content_id, user_id);
