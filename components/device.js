/* <doc-device model="iphone-14-pro" [color="black|silver|gold|…"] [width="300"] [caption="…"]>
     …screen content: any HTML, laid out at the device's real CSS width…
   </doc-device>
   <doc-device model="browser" [url="app.example.com"] [caption="…"]>…page content…</doc-device>
   A device frame around a screen. Phone, tablet and laptop frames come from devices.css (MIT, vendor/devices.css):
     iphone-14-pro, iphone-14, iphone-x, google-pixel-6-pro, galaxy-s8, ipad-pro, macbook-pro, surface-pro-2017, …
   (any .device-<model> class the library ships; colours are its .device-<color> classes).
   The content keeps the device's real width (e.g. 390 px for an iPhone 14 Pro) and the whole frame is scaled down
   to `width` or to the column, so a mock looks the same on every screen. model="browser" is a fluid window with
   a URL bar instead. Put several in a <div class="device-row"> to show them side by side. */
(() => {
  const PARTS = ['stripe', 'header', 'sensors', 'btns', 'power', 'home'];

  class DocDevice extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const model = (this.getAttribute('model') || 'iphone-14-pro').toLowerCase();
      const caption = this.getAttribute('caption');
      const screen = document.createElement('div');
      screen.className = 'ddev-app';
      screen.append(...this.childNodes);

      if (model === 'browser') {
        const url = this.getAttribute('url') || '';
        this.innerHTML = `<div class="ddev-browser"><div class="ddev-bar"><i></i><i></i><i></i>`
          + `<span class="ddev-url">${Docs.esc(url)}</span></div></div>`;
        this.firstChild.append(screen);
        if (caption) this.insertAdjacentHTML('beforeend', `<div class="ddev-caption">${Docs.esc(caption)}</div>`);
        return;
      }

      try { await Docs.lib('devices'); } catch (e) { return Docs.fail(this, `doc-device: ${e.message}`); }
      const color = this.getAttribute('color');
      this.innerHTML = `<div class="ddev-fit"><div class="device device-${Docs.esc(model)}${color ? ` device-${Docs.esc(color)}` : ''}">`
        + `<div class="device-frame"></div>${PARTS.map(p => `<div class="device-${p}"></div>`).join('')}</div></div>`
        + (caption ? `<div class="ddev-caption">${Docs.esc(caption)}</div>` : '');
      const dev = this.querySelector('.device');
      screen.classList.add('device-screen');
      dev.firstChild.append(screen);
      this.native = [dev.offsetWidth, dev.offsetHeight];
      if (!this.native[0]) return Docs.fail(this, `doc-device: devices.css has no model "${model}"`);
      this.fit();
      new ResizeObserver(() => this.fit()).observe(this);
    }

    // scale the fixed-size frame to the requested width or the available column, never up
    fit() {
      const [w, h] = this.native;
      const want = parseFloat(this.getAttribute('width')) || w;
      const k = Math.min(1, want / w, (this.clientWidth || w) / w);
      const box = this.querySelector('.ddev-fit');
      box.style.width = `${w * k}px`;
      box.style.height = `${h * k}px`;
      box.firstChild.style.transform = `scale(${k})`;
    }
  }

  customElements.define('doc-device', DocDevice);
})();
