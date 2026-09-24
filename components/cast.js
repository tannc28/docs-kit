/* doc-cast — a terminal session that replays: commands type themselves, output appears, the text stays copyable.
   <doc-cast [cols="80"] [rows="12"] [speed="1"] [autoplay] [loop] [title="…"]>
     <script type="text/plain">
       $ kubectl get pods
       NAME                     READY   STATUS
       api-7d9f8b6c5d-x2k4p     1/1     Running
       $ kubectl logs api-7d9f8b6c5d-x2k4p | tail -1
       Started in 2.1 s
     </script>
   </doc-cast>
   Write a plain transcript: a line starting with "$ " is a command (typed out), every other line is its output.
   A real asciinema recording (asciicast v2: a JSON header line, then [time, "o", "text"] lines) plays as recorded.
   Played by asciinema-player; the recording is inline, so it works from file://. In Markdown: ```terminal or ```cast. */
(() => {
  // Turns a transcript into asciicast v2: commands typed at ~25 chars/s, output one line every 60 ms, a pause after each command.
  function fromTranscript(text, cols, rows) {
    const events = [];
    let t = 0.3;
    const out = s => events.push([+t.toFixed(3), 'o', s]);
    for (const line of text.split('\n')) {
      if (line.startsWith('$ ')) {
        t += 0.5;
        out('\u001b[1;32m$\u001b[0m ');
        for (const ch of line.slice(2)) { t += 0.04; out(ch); }
        t += 0.35;
        out('\r\n');
      } else {
        t += 0.06;
        out(line + '\r\n');
      }
    }
    t += 1;
    out('');
    return [JSON.stringify({ version: 2, width: cols, height: rows }), ...events.map(e => JSON.stringify(e))].join('\n');
  }

  // Time of the last event, so the poster can show the finished session: readable before anyone presses play.
  function lastTime(cast) {
    const lines = cast.trim().split('\n');
    try { return JSON.parse(lines[lines.length - 1])[0] || 0; } catch { return 0; }
  }

  class DocCast extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script');
      const raw = (holder ? holder.textContent : this.textContent).replace(/^\s*\n|\s+$/g, '');
      const pad = Math.min(...raw.split('\n').filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
      const text = raw.split('\n').map(l => l.slice(pad)).join('\n');
      const lines = text.split('\n').length;
      const cols = parseInt(this.getAttribute('cols'), 10) || Math.min(120, Math.max(60, ...text.split('\n').map(l => l.length + 2)));
      const rows = parseInt(this.getAttribute('rows'), 10) || Math.min(24, Math.max(4, lines + 2))   // one spare row: the control bar overlaps the last one;
      let cast;
      try { cast = /^\s*\{/.test(text) && JSON.parse(text.split('\n')[0]).version ? text : fromTranscript(text, cols, rows); }
      catch { cast = fromTranscript(text, cols, rows); }
      const box = document.createElement('div');
      box.className = 'dcast-box';
      const title = this.getAttribute('title');
      this.replaceChildren(...(title ? [Object.assign(document.createElement('div'), { className: 'dcast-title', textContent: title })] : []), box);
      try {
        await Docs.lib('cast');
        const end = lastTime(cast);
        AsciinemaPlayer.create({ data: cast }, box, {
          autoPlay: this.hasAttribute('autoplay'), loop: this.hasAttribute('loop'), speed: parseFloat(this.getAttribute('speed')) || 1,
          idleTimeLimit: 2, fit: false, terminalFontSize: '13px',
          terminalFontFamily: getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'monospace',
          poster: `npt:${Math.max(0, end - 0.05).toFixed(2)}`, theme: 'asciinema', controls: true,
        });
      } catch (e) {
        Docs.fail(this, `doc-cast: ${e.message}`);
      }
    }
  }

  customElements.define('doc-cast', DocCast);
})();
