// ========== Nawwa Room: ربط Jitsi Meet ==========

let jitsiApi = null;

function startJitsiCall(roomName) {
  const container = $('jitsi-container');
  if (!container) return;

  // إنهاء أي مكالمة سابقة
  if (jitsiApi) {
    jitsiApi.dispose();
    jitsiApi = null;
  }

  container.innerHTML = '';

  if (!roomName) {
    showToast('خطأ: لا يوجد اسم للغرفة');
    return;
  }

  try {
    const options = {
      roomName: roomName,
      parentNode: container,
      width: '100%',
      height: 380,
      userInfo: {
        displayName: currentUser.name
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'مشارك',
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions',
          'fullscreen', 'fodeviceselection', 'hangup',
          'chat', 'raisehand', 'tileview', 'settings'
        ]
      }
    };

    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', options);

    jitsiApi.addEventListener('videoConferenceJoined', () => {
      showToast('✓ انضممت للمكالمة');
    });

    jitsiApi.addEventListener('videoConferenceLeft', () => {
      endJitsiCall();
      showToast('تم مغادرة المكالمة');
    });

  } catch (e) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:8px">
      <p>تعذّر تحميل المكالمة</p>
      <small>تأكد من اتصالك بالإنترنت</small>
    </div>`;
    console.error('Jitsi error:', e);
  }
}

function endJitsiCall() {
  if (jitsiApi) {
    jitsiApi.executeCommand('hangup');
    jitsiApi.dispose();
    jitsiApi = null;
  }
  const container = $('jitsi-container');
  if (container) container.innerHTML = '';
}
