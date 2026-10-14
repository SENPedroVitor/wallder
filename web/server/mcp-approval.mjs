// Only permission forms can use the chat's Allow button without collecting input.
export function permissionContent(schema) {
  if (!schema || typeof schema !== 'object') throw new Error('A conexão não informou um formulário de autorização válido.')
  const properties = schema.properties || {}
  const content = {}
  for (const [key, spec] of Object.entries(properties)) {
    if (spec?.enum?.includes('once')) content[key] = 'once'
    else if (spec?.enum?.includes('session')) content[key] = 'session'
    else if ((schema.required || []).includes(key)) throw new Error('Esta conexão exige informações adicionais. Conclua a configuração no aplicativo conectado.')
  }
  return content
}
