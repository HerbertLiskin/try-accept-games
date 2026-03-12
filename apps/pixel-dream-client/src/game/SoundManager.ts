export class SoundManager {
  private bgmAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private tracks: string[] = ['/ritual.mp3', '/glaza.mp3']; // Placeholder tracks
  private currentTrackIndex: number = 0;

  init() {
    if (this.bgmAudio) return; // Keep playing if already active
    this.bgmAudio = new Audio(this.tracks[this.currentTrackIndex]);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.5;
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

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = this.tracks[this.currentTrackIndex];
      this.bgmAudio.load();
      if (!this.isMuted) {
         this.bgmAudio.play().catch(e => console.warn('Audio auto-play prevented', e));
      }
    }
  }
}

export const soundManager = new SoundManager();
