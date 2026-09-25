import { afterEach, expect, it, vi } from 'vitest'
import { optimizeCV } from './optimizer'
import * as llm from '../llm'
afterEach(() => vi.restoreAllMocks())
const text = 'ANA\nana@example.com\n\nEXPERIÊNCIA\nEmpresa A · 2020–2024\n\nHABILIDADES\nC#, .NET, React\n\nIDIOMAS\nPortuguês'
it('preserva cabeçalho e todo o conteúdo quando a IA reordena seções', async () => {
 vi.spyOn(llm,'runLLM').mockResolvedValue('{"order":[1,0,2]}')
 const result = await optimizeCV(text,'React',{provider:'ollama'})
 expect(result.startsWith('ANA\nana@example.com')).toBe(true)
 expect(result.indexOf('HABILIDADES')).toBeLessThan(result.indexOf('EXPERIÊNCIA'))
 for (const line of text.split('\n').filter(Boolean)) expect(result).toContain(line)
})
it.each(['{"order":[0,0,2]}','{"order":[0,1,3]}','{"order":[0]}','{"curriculum":"Inventado"}','invalid'])('recusa resposta inválida %s sem alterar fatos', async response => {
 vi.spyOn(llm,'runLLM').mockResolvedValue(response)
 const fallback = vi.fn()
 expect(await optimizeCV(text,'Java',{provider:'ollama'},fallback)).toBe(text)
 expect(fallback).toHaveBeenCalledOnce()
})
