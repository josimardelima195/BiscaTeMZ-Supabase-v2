# Notas sobre métodos de pagamento em Moçambique

- M-Pesa Developer Portal: https://business.m-pesa.com/developers/
  - Disponibiliza APIs C2B, reversões e consulta de estado.
  - Exige registo empresarial/desenvolvedor, API key e public key, sandbox e revisão antes do go-live.

- Vodacom M-Pesa Moçambique: https://www.vm.co.mz/m-pesa
  - Apresenta soluções para empresas de colectas, desembolsos, pagamentos e integrações/Open API.

- PAY Moçambique: https://pay.co.mz/en/mpesa-payments
  - Declara integração com M-Pesa, e-Mola, mKesh e cartões através de API/gateway.
  - A página consultada indica cobrança por transação e webhooks assinados; confirmar contrato, taxas e licença antes de usar.

Decisão para o BiscaTeMZ: manter o fluxo manual enquanto não houver credenciais empresariais, sandbox, contrato e webhooks verificados. A aplicação deve guardar o comprovativo, bloquear o início até confirmação administrativa, calcular 7%/93% no servidor e só registar o desembolso após verificação. Não inventar nem publicar um NIB antes de a empresa o validar.
