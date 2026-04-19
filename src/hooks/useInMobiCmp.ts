import { useEffect } from 'react';

const SCRIPT_ID = 'inmobi-cmp-script';
const IFRAME_NAME = '__tcfapiLocator';

/**
 * Charge le Consent Manager InMobi (TCF 2.3) UNIQUEMENT sur la page où
 * ce hook est appelé (page cookies). Le script est nettoyé au démontage
 * pour éviter tout conflit avec la navigation et les autres composants.
 *
 * Le CMP InMobi gère sa propre UI (modale plein écran responsive).
 * Aucun style supplémentaire n'est requis : il s'adapte automatiquement
 * au mobile et au desktop.
 */
export const useInMobiCmp = () => {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const host = 'www.themoneytizer.com';
    const url =
      'https://cmp.inmobi.com/choice/6Fv0cGNfc_bw8/' + host + '/choice.js?tag_version=V3';

    // Stub TCF API minimal (requis avant le chargement du script)
    (function makeStub() {
      const TCF_LOCATOR_NAME = IFRAME_NAME;
      const queue: any[] = [];
      let win: any = window;
      let cmpFrame: any;

      function addFrame() {
        const doc = win.document;
        const otherCMP = !!win.frames[TCF_LOCATOR_NAME];
        if (!otherCMP) {
          if (doc.body) {
            const iframe = doc.createElement('iframe');
            iframe.style.cssText = 'display:none';
            iframe.name = TCF_LOCATOR_NAME;
            doc.body.appendChild(iframe);
          } else {
            setTimeout(addFrame, 5);
          }
        }
        return !otherCMP;
      }

      function tcfAPIHandler(...args: any[]) {
        let gdprApplies: any;
        if (!args.length) return queue;
        if (args[0] === 'setGdprApplies') {
          if (args.length > 3 && args[2] === 2 && typeof args[3] === 'boolean') {
            gdprApplies = args[3];
            if (typeof args[2] === 'function') (args[2] as any)('set', true);
          }
        } else if (args[0] === 'ping') {
          const retr = { gdprApplies, cmpLoaded: false, cmpStatus: 'stub' };
          if (typeof args[2] === 'function') args[2](retr);
        } else {
          if (args[0] === 'init' && typeof args[3] === 'object') {
            args[3] = Object.assign(args[3], { tag_version: 'V3' });
          }
          queue.push(args);
        }
      }

      function postMessageEventHandler(event: MessageEvent) {
        const msgIsString = typeof event.data === 'string';
        let json: any = {};
        try {
          json = msgIsString ? JSON.parse(event.data as string) : event.data;
        } catch {}
        const payload = json.__tcfapiCall;
        if (payload) {
          (window as any).__tcfapi(
            payload.command,
            payload.version,
            (retValue: any, success: boolean) => {
              let returnMsg: any = {
                __tcfapiReturn: { returnValue: retValue, success, callId: payload.callId },
              };
              if (msgIsString) returnMsg = JSON.stringify(returnMsg);
              if (event && event.source && (event.source as any).postMessage) {
                (event.source as any).postMessage(returnMsg, '*');
              }
            },
            payload.parameter
          );
        }
      }

      while (win) {
        try {
          if (win.frames[TCF_LOCATOR_NAME]) {
            cmpFrame = win;
            break;
          }
        } catch {}
        if (win === window.top) break;
        win = win.parent;
      }

      if (!cmpFrame) {
        addFrame();
        win.__tcfapi = tcfAPIHandler;
        win.addEventListener('message', postMessageEventHandler, false);
      }
    })();

    // Charge le script CMP
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.type = 'text/javascript';
    script.src = url;
    document.head.appendChild(script);

    // Nettoyage : retire le script et l'iframe au démontage pour éviter
    // tout conflit avec les autres pages du site.
    return () => {
      const s = document.getElementById(SCRIPT_ID);
      if (s) s.remove();
      const iframe = document.getElementsByName(IFRAME_NAME)[0];
      if (iframe) iframe.remove();
    };
  }, []);
};
