(() => {
  const joinScreen = document.getElementById('join-screen');
  const chatScreen = document.getElementById('chat-screen');
  const joinForm = document.getElementById('join-form');
  const wordInput = document.getElementById('word-input');
  const roomWordEl = document.getElementById('room-word');
  const presenceCountEl = document.getElementById('presence-count');
  const messagesEl = document.getElementById('messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const leaveBtn = document.getElementById('leave-btn');
  const ringProgress = document.getElementById('ring-progress');
  const ringSeconds = document.getElementById('ring-seconds');

  const RING_CIRCUMFERENCE = 2 * Math.PI * 17; // matches r=17 in the SVG
  let clearMs = 20000;
  let countdownTimer = null;
  let remainingSeconds = 20;
  let ws = null;

  function connect(word) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${window.location.host}`);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'join', word }));
    });

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    });

    ws.addEventListener('close', () => {
      addSystemMessage('Disconnected. Refresh to rejoin.');
    });
  }

  function handleServerMessage(data) {
    switch (data.type) {
      case 'joined':
        clearMs = data.clearMs || 20000;
        roomWordEl.textContent = wordInput.value.trim().toLowerCase();
        presenceCountEl.textContent = data.count;
        joinScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        startCountdown();
        chatInput.focus();
        break;
      case 'chat':
        addChatMessage(data.name, data.text);
        break;
      case 'system':
        addSystemMessage(data.text);
        break;
      case 'presence':
        presenceCountEl.textContent = data.count;
        break;
      case 'clear':
        dissolveAndClear();
        break;
    }
  }

  function addChatMessage(name, text) {
    const el = document.createElement('div');
    el.className = 'msg';
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = name;
    const body = document.createElement('span');
    body.textContent = text;
    el.appendChild(who);
    el.appendChild(body);
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'msg system';
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function dissolveAndClear() {
    messagesEl.classList.add('dissolving');
    setTimeout(() => {
      messagesEl.innerHTML = '';
      messagesEl.classList.remove('dissolving');
    }, 480);
    resetCountdown();
  }

  function startCountdown() {
    remainingSeconds = Math.round(clearMs / 1000);
    updateRing();
    countdownTimer = setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds < 0) remainingSeconds = Math.round(clearMs / 1000);
      updateRing();
    }, 1000);
  }

  function resetCountdown() {
    remainingSeconds = Math.round(clearMs / 1000);
    updateRing();
  }

  function updateRing() {
    const total = Math.round(clearMs / 1000);
    const fraction = Math.max(0, remainingSeconds / total);
    ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
    ringSeconds.textContent = String(Math.max(0, remainingSeconds));
    ringProgress.classList.toggle('warn', remainingSeconds <= 5);
  }

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const word = wordInput.value.trim();
    if (!word) return;
    connect(word);
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'chat', text }));
    chatInput.value = '';
  });

  leaveBtn.addEventListener('click', () => {
    if (ws) ws.close();
    window.location.href = 'https://www.youtube.com';
  });

  // Best-effort: close the socket cleanly if the tab/app is closed or backgrounded.
  window.addEventListener('pagehide', () => {
    if (ws) ws.close();
  });
})();
