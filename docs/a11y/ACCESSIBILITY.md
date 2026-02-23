# Acessibilidade

## Objetivo
- Manter conformidade com WCAG 2.1 AA em toda a interface.
- Garantir navegacao completa por teclado, feedback com ARIA e foco previsivel.
- Priorizar componentes base reutilizaveis (Button, Input, Modal, Select, Textarea).

## Padroes adotados
- Estrutura semantica com landmarks: `role="banner"`, `role="navigation"`, `role="main"` e `role="complementary"`.
- Skip links para pular direto ao conteudo principal e areas criticas.
- Inputs sempre vinculados a `label` com `htmlFor` e `id` unicos.
- Erros de formulario com `aria-invalid` e `aria-describedby`.
- Modal com `role="dialog"`, `aria-modal`, focus trap e restauracao de foco.
- Regioes dinamicas com `aria-live` e `role="status"`.
- Contraste revisado para texto, bordas e elementos interativos.

## Guia de ARIA labels
- Botao com icone sem texto: usar `aria-label` descritivo.
- Preferir `aria-labelledby` quando existir label visivel.
- Erros: `aria-describedby` deve apontar para a mensagem correspondente.
- Evitar `aria-label` duplicado em elementos com texto visivel.

## Atalhos de teclado
- Sidebar: numeros 1-9 focam rotas principais.
- Modal: Tab/Shift+Tab ciclam dentro do modal, Esc fecha.
- Dropdowns: ArrowUp/ArrowDown navegam entre itens, Esc fecha.

## Checklist para novos componentes
- [ ] Elementos interativos sao focaveis por teclado.
- [ ] Ha `aria-label` ou `aria-labelledby` quando necessario.
- [ ] Estados dinamicos usam `aria-live`/`role="status"`/`role="alert"`.
- [ ] Erros de formulario usam `aria-invalid` e `aria-describedby`.
- [ ] Contraste atende 4.5:1 para texto e 3:1 para componentes UI.
- [ ] Focus trap aplicado em modais e dropdowns.
- [ ] Skip links atualizados quando novas areas criticas surgirem.

## Exemplos

### Botao com icone
```tsx
<Button aria-label="Salvar" onClick={handleSave}>
  <Save className="h-4 w-4" />
</Button>
```

### Input com erro
```tsx
<Input
  label="Email"
  type="email"
  required
  error="Campo obrigatorio"
  aria-describedby="email-error"
/>
```

### Modal com titulo e descricao
```tsx
const trapRef = useFocusTrap(isOpen)

<Modal isOpen={isOpen} onClose={onClose}>
  <ModalTitle>Confirmar acao</ModalTitle>
  <ModalDescription>Esta operacao nao pode ser desfeita.</ModalDescription>
  <Button onClick={onConfirm}>Confirmar</Button>
</Modal>
```

## Referencias
- WCAG 2.1 AA: https://www.w3.org/TR/WCAG21/
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
