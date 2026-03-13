export class SoundManager {
  private bgmAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private tracks: string[] = ['/ritual.mp3', '/glaza.mp3']; // Placeholder tracks
  private currentTrackIndex: number = 0;

  init() {
    if (this.bgmAudio) return; // Keep playing if already active
    this.bgmAudio = new Audio(this.tracks[this.currentTrackIndex]);
    this.bgmAudio.loop = false; // Disable loop to allow 'ended' event
    this.bgmAudio.volume = 0.5;
    
    this.bgmAudio.addEventListener('ended', () => {
      this.nextTrack();
    });
  }

  togglePlayback() {
    if (!this.bgmAudio) return false;
    if (this.bgmAudio.paused) {
      this.playBgm();
    } else {
      this.stopBgm();
    }
    return !this.bgmAudio.paused;
  }

  destroy() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = '';
      this.bgmAudio.load();
      this.bgmAudio = null;
    }
  }

  playBgm() {
    if (this.bgmAudio && !this.isMuted) {
      this.bgmAudio.play().catch(e => console.warn('Audio auto-play prevented', e));
    }
  }

  stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgmAudio) {
      this.bgmAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  getCurrentTrackName() {
    const src = this.tracks[this.currentTrackIndex];
    return src.split('/').pop()?.replace('.mp3', '') || 'Unknown';
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.applyTrackChange();
  }

  prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.applyTrackChange();
  }

  private applyTrackChange() {
    if (this.bgmAudio) {
      const wasPlaying = !this.bgmAudio.paused;
      this.bgmAudio.pause();
      this.bgmAudio.src = this.tracks[this.currentTrackIndex];
      this.bgmAudio.load();
      if (wasPlaying && !this.isMuted) {
         this.bgmAudio.play().catch(e => console.warn('Audio auto-play prevented', e));
      }
    }
  }

  isBgmPlaying() {
    return this.bgmAudio ? !this.bgmAudio.paused : false;
  }
}

export const soundManager = new SoundManager();
