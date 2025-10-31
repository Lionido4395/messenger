// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 简单暴露一个接口给页面调试（可选）
contextBridge.exposeInMainWorld('electronCSP', {
  lastNonce: null
});

ipcRenderer.on('injectScriptToBlob', (event) => {
  const code = `
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      setTimeout(() => {
        const list = document.querySelectorAll('div[data-pagelet="MWMessageRow"]')
        const last = list[list.length - 1]
        console.log(last)
        const oriText = last.querySelector('div[dir="auto"]').innerText;
        const oriDiv = document.createElement('div');
        oriDiv.innerText = oriText;
        last.querySelector('div[dir="auto"]').innerText = 'hello translate';
        last.querySelector('div[dir="auto"]').appendChild(oriDiv);
      }, 1000)
    }
  }, true);
`;

    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    const s = document.createElement('script');
    s.src = url;  // 使用 blob URL
    document.documentElement.appendChild(s);
    s.remove();

});
ipcRenderer.on('csp-nonce', (event, { nonce }) => {
  console.log(nonce, '=======')
  injectScriptToPage(`alert(1)`, nonce);
  // 如果你的目标是注入一个 script 并让它执行（例如插入 inline script 或外链），请用下面的方式：
//   console.log(nonce, '=====')
//   if (nonce) {
//     try {
//       const s = document.createElement('script');
//       // 设置 property（非常关键：在 append 前设置）
//       s.nonce = nonce;
//       // 如果是 inline：
//       // s.textContent = "console.log('injected with nonce:', document.currentScript && document.currentScript.nonce);";
//       // 如果是外链：
//       // s.src = 'https://your-cdn.example.com/your-injected.js';
//       // 如果是 inline 且想立刻执行，使用 textContent 并 append
//     //   s.textContent = "alert(1)";
//       document.documentElement.appendChild(s); // 或 document.head.appendChild(s)
//     } catch (e) {
//       console.error('inject script error', e);
//     }
//   } else {
//     console.warn('no nonce received for', url);
//   }
});

let TRANSLATE_CONFIG = {
  url: 'https://libretranslate.com/translate',
  apiKey: null,
  source: 'auto',
  target: 'en'
};
// 接收 config
ipcRenderer.on('translate-config', (ev, cfg) => {
  TRANSLATE_CONFIG = { ...TRANSLATE_CONFIG, ...cfg };
});
// 暴露一个小工具到页面（可选，用于 debug）
contextBridge.exposeInMainWorld('electronTranslate', {
  getConfig: () => TRANSLATE_CONFIG
});
function injectScriptToPage(code, nonce) {
  const script = document.createElement('script');
  try {
    if (nonce) script.nonce =nonce;
  } catch(e) { /* ignore */ }
  script.textContent = code;
  document.documentElement?.appendChild(script);
  script.remove();
}
