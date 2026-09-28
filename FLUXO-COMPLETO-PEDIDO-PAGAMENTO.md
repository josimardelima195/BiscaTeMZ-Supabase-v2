# Fluxo completo BiscaTeMZ

## Cliente

1. Preenche o contacto em **Conta**.
2. Escolhe um prestador.
3. Preenche modalidade, problema, local e horário.
4. Envia o pedido.
5. Aguarda o prestador aceitar.
6. Depois da aceitação, abre a conversa e vê o contacto do prestador.
7. Combina o valor no chat.
8. Abre **Passo 1 · Enviar pagamento e comprovativo**.
9. O preço inicial do prestador aparece preenchido; pode ser ajustado ao valor combinado.
10. Transfere para `868787572`.
11. Faz upload da fotografia/PDF do comprovativo.
12. Aguarda a confirmação administrativa.
13. Depois de o administrador confirmar e concluir a prestação, envia a avaliação de 1 a 5 estrelas.

## Prestador

1. Recebe a notificação do pedido.
2. Aceita na área **Conta → Pedidos e conversas**.
3. O chat é aberto e uma mensagem inicial é enviada automaticamente ao cliente.
4. Vê o contacto do cliente depois da aceitação.
5. Combina o preço final e os detalhes no chat.
6. Aguarda o pagamento e a confirmação administrativa.

## Administrador

- **Administração → Pedidos e estados** mostra pedidos feitos, aceites, agendados, em curso e concluídos.
- O dashboard mostra clientes, prestadores, pedidos, prestações em curso, concluídas, pagamentos pendentes e receita confirmada.
- **Administração → Pagamentos** mostra o valor, os 7% da plataforma, os 93% do prestador e o comprovativo.
- O administrador confirma o comprovativo.
- Depois do pagamento confirmado, o administrador marca a prestação como concluída.
- O cliente recebe a opção de avaliar.

## Migrações

Execute todas as migrações em `supabase/migrations` no SQL Editor pela ordem do nome do ficheiro, caso ainda não tenham sido executadas no projeto Supabase.
