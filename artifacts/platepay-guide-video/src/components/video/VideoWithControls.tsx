import { useState } from 'react';

const VIDEO_SRC = `${import.meta.env.BASE_URL}video/platepay-walkthrough.mp4`;
const POSTER_SRC = `${import.meta.env.BASE_URL}images/walkthrough-poster.jpg`;

export default function VideoWithControls() {
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    setLoadError(false);
    setAttempt(value => value + 1);
  };

  return (
    <main className="watch-page">
      <header className="watch-header">
        <div className="brand-lockup" aria-label="PlatePay">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Plate<span className="brand-accent">Pay</span></span>
        </div>
        <span className="header-note"><i aria-hidden="true" /> PRODUCT WALKTHROUGH</span>
      </header>

      <section className="watch-content" aria-labelledby="walkthrough-title">
        <div className="watch-intro">
          <p className="eyebrow">ONE PLATE. TWO HISTORIES.</p>
          <h1 id="walkthrough-title">Your plate.<br /><span>Your call.</span></h1>
          <p className="intro-copy">A clear request, reviewed by the driver. One approved payment, visible to both sides.</p>
        </div>

        <div className="video-card">
          <div className="video-heading">
            <span className="video-title">PlatePay, in 28 seconds</span>
            <span className="runtime"><span aria-hidden="true">16:9</span> &nbsp;·&nbsp; 00:28</span>
          </div>
          <div className="player-frame">
            <video
              key={attempt}
              className="walkthrough-video"
              src={VIDEO_SRC}
              poster={POSTER_SRC}
              controls
              playsInline
              preload="auto"
              aria-label="PlatePay walkthrough video"
              onCanPlay={() => setLoadError(false)}
              onError={() => setLoadError(true)}
            />
          </div>
          {loadError && (
            <div className="player-error" role="alert">
              <span>The walkthrough could not be loaded.</span>
              <button type="button" onClick={retry}>Try again</button>
            </div>
          )}
          <div className="video-caption">
            <span>Merchant request → driver approval → shared payment record</span>
            <span className="caption-live"><i aria-hidden="true" /> SOUND ON</span>
          </div>
        </div>

        <footer className="watch-footer">
          <span>Every payment starts with a driver’s decision.</span>
          <span className="footer-location">KUWAIT&nbsp; / &nbsp;PLATEPAY</span>
        </footer>
      </section>
    </main>
  );
}
