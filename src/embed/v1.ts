import type { BirdBotInitOptions, BirdBotInstance, HostInboundMessage } from './types.js';

const PANEL_WIDTH = 440;
const PANEL_MIN_WIDTH = 340;
const MOBILE_BREAKPOINT = 480;
const ANIMATION_MS = 200;

function resolveElement(selector: string | HTMLElement): HTMLElement | null {
  if (typeof selector === 'string') {
    return document.querySelector<HTMLElement>(selector);
  }
  return selector;
}

function createPanel(apiUrl: string): {
  backdrop: HTMLDivElement;
  panel: HTMLDivElement;
  iframe: HTMLIFrameElement;
} {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.15)',
    'z-index:9999',
    'opacity:0',
    'transition:opacity 200ms ease',
    'display:none',
  ].join(';');

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed',
    'top:0',
    'right:0',
    'height:100vh',
    'width:440px',
    'min-width:340px',
    'background:#fff',
    'z-index:10000',
    'box-shadow:-2px 0 12px rgba(0,0,0,0.12)',
    'transform:translateX(100%)',
    `transition:transform ${ANIMATION_MS}ms ease`,
    'display:none',
  ].join(';');

  const iframe = document.createElement('iframe');
  iframe.src = `${apiUrl.replace(/\/$/, '')}/widget/`;
  iframe.style.cssText = 'width:100%;height:100%;border:none';
  iframe.setAttribute('title', 'BirdBot чат поддержки');
  iframe.setAttribute('allow', 'clipboard-write');

  panel.appendChild(iframe);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  return { backdrop, panel, iframe };
}

function applyResponsiveWidth(panel: HTMLDivElement): void {
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    panel.style.width = '100vw';
    panel.style.minWidth = '100vw';
  } else {
    panel.style.width = `${PANEL_WIDTH}px`;
    panel.style.minWidth = `${PANEL_MIN_WIDTH}px`;
  }
}

function setButtonUnread(button: HTMLElement, hasUnread: boolean): void {
  if (getComputedStyle(button).position === 'static') {
    button.style.position = 'relative';
  }

  let badge = button.querySelector<HTMLElement>('.birdbot-unread-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'birdbot-unread-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.style.cssText = [
      'position:absolute',
      'top:2px',
      'right:2px',
      'width:10px',
      'height:10px',
      'background:#ff4d4f',
      'border:2px solid #fff',
      'border-radius:50%',
      'display:none',
      'pointer-events:none',
      'box-sizing:border-box',
      'z-index:1',
    ].join(';');
    button.appendChild(badge);
  }

  badge.style.display = hasUnread ? 'block' : 'none';
}

function init(options: BirdBotInitOptions): BirdBotInstance {
  const buttonEl = resolveElement(options.button);
  if (!buttonEl) {
    throw new Error(`BirdBot: button not found: ${options.button}`);
  }

  const apiUrl = options.apiUrl.replace(/\/$/, '');
  const { backdrop, panel, iframe } = createPanel(apiUrl);
  let isOpen = false;

  iframe.addEventListener('load', () => {
    iframe.contentWindow?.postMessage({ type: 'birdbot:panel-state', open: isOpen }, '*');
    if (isOpen) void sendToWidget();
  });

  const sendContextToWidget = async (): Promise<void> => {
    const context = await Promise.resolve(options.getContext());
    iframe.contentWindow?.postMessage({ type: 'birdbot:context', context: context ?? {} }, '*');
  };

  const sendToWidget = async (): Promise<void> => {
    const token = await Promise.resolve(options.getToken());
    const context = await Promise.resolve(options.getContext());
    if (!token) return;

    const msg = {
      type: 'birdbot:init' as const,
      token,
      context: context ?? {},
    };
    iframe.contentWindow?.postMessage(msg, '*');
    iframe.contentWindow?.postMessage({ type: 'birdbot:panel-state', open: true }, '*');
  };

  const updateContext = (): void => {
    if (!isOpen) return;
    void sendContextToWidget();
  };

  const open = (): void => {
    if (isOpen) return;
    isOpen = true;
    setButtonUnread(buttonEl, false);
    applyResponsiveWidth(panel);
    backdrop.style.display = 'block';
    panel.style.display = 'block';
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      panel.style.transform = 'translateX(0)';
    });
    void sendToWidget();
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    backdrop.style.opacity = '0';
    panel.style.transform = 'translateX(100%)';
    iframe.contentWindow?.postMessage({ type: 'birdbot:panel-state', open: false }, '*');
    setTimeout(() => {
      if (!isOpen) {
        backdrop.style.display = 'none';
        panel.style.display = 'none';
      }
    }, ANIMATION_MS);
  };

  const toggle = (): void => {
    if (isOpen) close();
    else open();
  };

  const onButtonClick = (): void => toggle();
  buttonEl.addEventListener('click', onButtonClick);

  const onBackdropClick = (): void => close();
  backdrop.addEventListener('click', onBackdropClick);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && isOpen) close();
  };
  document.addEventListener('keydown', onKeyDown);

  const onResize = (): void => {
    if (isOpen) applyResponsiveWidth(panel);
  };
  window.addEventListener('resize', onResize);

  const onMessage = (event: MessageEvent<HostInboundMessage>): void => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'birdbot:ready' && isOpen) {
      void sendToWidget();
    }
    if (data.type === 'birdbot:request-close') {
      close();
    }
    if (data.type === 'birdbot:unread') {
      setButtonUnread(buttonEl, Boolean(data.hasUnread));
    }
  };
  window.addEventListener('message', onMessage);

  const destroy = (): void => {
    buttonEl.removeEventListener('click', onButtonClick);
    backdrop.removeEventListener('click', onBackdropClick);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('message', onMessage);
    backdrop.remove();
    panel.remove();
  };

  return { open, close, toggle, destroy, updateContext };
}

declare global {
  interface Window {
    BirdBot: {
      init: typeof init;
    };
  }
}

window.BirdBot = { init };

export { init };
