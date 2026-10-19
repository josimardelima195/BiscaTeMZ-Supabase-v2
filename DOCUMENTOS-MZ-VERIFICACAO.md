# Verificação documental de prestadores

A Direção Nacional de Identificação Civil descreve o BI biométrico moçambicano como alinhado às especificações ICAO Doc 9303 e menciona circuito integrado/chip, zona de leitura óptica, fotografia e elementos de segurança. A Lei n.º 6/2022 indica que a confirmação da autenticidade compete à entidade emitente. Por isso, o sistema não aprova um BI apenas por reconhecer cores, símbolos ou texto numa fotografia.

A triagem implementada no cadastro faz apenas verificações preliminares: frente e verso presentes, tipo de ficheiro suportado, tamanho mínimo e armazenamento privado. Os BI ficam com estado `review`/`manual_review` e o administrador continua a comparar as duas faces e a decidir. Uma verificação forte de autenticidade exigiria um fornecedor KYC compatível ou integração oficial, com credenciais e política de proteção de dados.

As imagens de categoria são apenas imagens ilustrativas de serviço. A página passa a privilegiar fotografias reais enviadas pelo próprio prestador no portfólio. Não são copiadas automaticamente fotografias aleatórias do Google para representar o trabalho de uma pessoa.

Fontes:

- https://www.intic.gov.mz/wp-content/uploads/2023/04/DNIC-SISTEMA-DE-IDENTIFICACAO-CIVIL.pdf — Direção Nacional de Identificação Civil, Sistema de Identidade Civil Electrónica.
- https://www.parlamento.mz/wp-content/uploads/2022/02/Lei-do-BI.pdf — Lei do Bilhete de Identidade, Lei n.º 6/2022.
- https://www.idanalyzer.com/en/supported-documents/mozambique — exemplo de fornecedor que descreve OCR, MRZ/barcode, verificações de autenticidade e prova facial para documentos moçambicanos.
- https://accurascan.com/kyc/mozambique/ — exemplo de fornecedor de KYC/OCR/biometria; não foi integrado nesta alteração.
