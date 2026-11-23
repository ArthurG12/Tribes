export function registrationMessageForDelivery(delivery) {
  if (delivery?.status === "paused" && delivery.reason === "daily_quota_exceeded") {
    return "Atingimos o limite diário de envio de emails. Seu pedido entrou na fila e enviaremos o link assim que a cota for renovada. Depois de enviado, ele será válido por 24 horas.";
  }
  if (delivery?.status === "paused" && delivery.reason === "monthly_quota_exceeded") {
    return "A cota mensal de envio de emails foi atingida. Seu pedido entrou na fila e enviaremos o link assim que os envios forem liberados. Depois de enviado, ele será válido por 24 horas.";
  }
  if (delivery?.status === "sent") {
    return "Se este e-mail puder ser cadastrado, enviaremos um link para você escolher seu nome e senha. Ele será válido por 24 horas.";
  }
  if (delivery?.status === "failed") {
    return "Não foi possível enviar o link agora. Tente solicitar novamente mais tarde.";
  }
  if (["queued", "pending", "processing"].includes(delivery?.status)) {
    return "Seu pedido foi recebido e entrou na fila de envio. Enviaremos o link assim que houver disponibilidade; depois de enviado, ele será válido por 24 horas.";
  }
  return "Se este e-mail puder ser cadastrado, enviaremos um link para continuar.";
}
