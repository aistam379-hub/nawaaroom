// ========== Nawwa Chat: ربط Jitsi Meet ==========
let jitsiApi = null;

function startJitsiCall(roomName, audioOnly) {
  const container = $('jitsi-container');
  if (!container) return;

  if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }
  container.innerHTML = '';
  if (!roomName) { showToast('تعذّر بدء المكالمة'); return; }

  try {
    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName,
      parentNode: container,
      width: '100%',
      height: '100%',
      userInfo: { displayName: (currentUser && currentUser.name) || 'مستخدم' },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: !!audioOnly,
        disableDeepLinking: true,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'مشارك',
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'fullscreen', 'hangup', 'chat', 'tileview', 'settings']
      }
    });
    jitsiApi.addEventListener('videoConferenceLeft', () => { endCall(); });
  } catch (e) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;flex-direction:column;gap:8px">
      <p>تعذّر تحميل المكالمة</p><small>تأكد من اتصالك بالإنترنت</small></div>`;
    console.error('Jitsi error:', e);
  }
}

function endJitsiCall() {
  if (jitsiApi) {
    try { jitsiApi.executeCommand('hangup'); } catch (e) {}
    jitsiApi.dispose();
    jitsiApi = null;
  }
  const container = $('jitsi-container');
  if (container) container.innerHTML = '';
}
