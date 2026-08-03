import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSettings, useUpdateSetting } from '../hooks/useSettings'

export function Settings() {
  const { data: settings, isLoading } = useSettings()
  const updateSetting = useUpdateSetting()

  const [formData, setFormData] = useState<Record<string, string>>({})

  const handleSave = useCallback(
    async (key: string, value: string) => {
      try {
        await updateSetting.mutateAsync({ key, value })
        toast.success(`Configuração "${key}" salva!`)
      } catch (err) {
        toast.error(`Erro ao salvar: ${err}`)
      }
    },
    [updateSetting]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Configurações</h1>

      <div className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Currículo</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caminho do CV Base (PDF)
              </label>
              <input
                type="text"
                defaultValue={settings?.cvBasePath || ''}
                placeholder="/home/user/meu-curriculo.pdf"
                onBlur={(e) => handleSave('cvBasePath', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Caminho absoluto para o arquivo PDF do seu currículo</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">IA para Otimização de CV</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provedor LLM
              </label>
              <select
                defaultValue={settings?.llmProvider || 'ollama'}
                onChange={(e) => handleSave('llmProvider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ollama">Ollama (local)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="none">Nenhum (regras locais)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo LLM
              </label>
              <input
                type="text"
                defaultValue={settings?.llmModel || 'qwen2.5-coder:7b'}
                placeholder="qwen2.5-coder:7b"
                onBlur={(e) => handleSave('llmModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Nome do modelo no Ollama (ex.: qwen2.5-coder:7b)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Base (Ollama)
              </label>
              <input
                type="text"
                defaultValue={settings?.llmBaseUrl || 'http://localhost:11434'}
                placeholder="http://localhost:11434"
                onBlur={(e) => handleSave('llmBaseUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key (apenas OpenAI/Anthropic)
              </label>
              <input
                type="password"
                defaultValue={settings?.llmApiKey || ''}
                placeholder="sk-..."
                onBlur={(e) => handleSave('llmApiKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Busca de Vagas</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termos de Busca (JSON array)
              </label>
              <textarea
                defaultValue={settings?.searchQueries || '["analista de desenvolvimento de sistemas pleno", "analista de sistemas pleno", "analista desenvolvedor pleno", "desenvolvedor de sistemas pleno"]'}
                rows={3}
                onBlur={(e) => handleSave('searchQueries', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localizações (JSON array)
              </label>
              <textarea
                defaultValue={settings?.searchLocations || '["Remoto", "São José do Rio Preto"]'}
                rows={2}
                onBlur={(e) => handleSave('searchLocations', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Automação</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Candidatura Automática</label>
                <p className="text-xs text-gray-500">Quando ativado, mover para "Candidatar" dispara o pipeline. Desativado por padrão (nada é enviado sem sua ação).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={settings?.autoApplyEnabled === 'true'}
                  onChange={(e) => handleSave('autoApplyEnabled', String(e.target.checked))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Navegador Headless</label>
                <p className="text-xs text-gray-500">Rodar automação sem janela visível</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={settings?.browserHeadless === 'true'}
                  onChange={(e) => handleSave('browserHeadless', String(e.target.checked))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
