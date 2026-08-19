import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandaloneDisplay() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIosSafari() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  )
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandaloneDisplay)
  const [installing, setInstalling] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setInstalled(true)
      return
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function onAppInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
      setFeedback('SprintPro instalado com sucesso.')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (installed) return

    if (isIosSafari()) {
      setFeedback('No iPhone/iPad: toque em Compartilhar → "Adicionar à Tela de Início".')
      return
    }

    if (!installPrompt) {
      setFeedback(
        'Use Chrome ou Edge em HTTPS. Se o botão não aparecer, abra o menu do navegador e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".',
      )
      return
    }

    setFeedback('')
    setInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setInstallPrompt(null)
        setFeedback('SprintPro instalado com sucesso.')
      } else {
        setFeedback('Instalação cancelada.')
      }
    } catch {
      setFeedback('Não foi possível iniciar a instalação. Tente pelo menu do navegador.')
    } finally {
      setInstalling(false)
    }
  }, [installPrompt, installed])

  return {
    installed,
    installing,
    canPromptInstall: Boolean(installPrompt) && !installed,
    isIos: isIosSafari(),
    feedback,
    install,
    clearFeedback: () => setFeedback(''),
  }
}
