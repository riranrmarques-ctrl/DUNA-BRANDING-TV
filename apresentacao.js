.results-wrap {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 18px;
  align-items: stretch;
}

.phone-card,
.benefit-card,
.cta-band {
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.95), rgba(8, 13, 22, 0.98));
  border: 1px solid rgba(132, 168, 220, 0.1);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

.phone-card {
  padding: 24px;
  display: grid;
  place-items: center;
  min-height: 320px;
  position: relative;
  overflow: hidden;
}

.phone-card::before {
  content: "";
  position: absolute;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(92, 149, 214, 0.16), transparent 68%);
  filter: blur(20px);
}

.phone {
  width: 210px;
  height: 410px;
  border-radius: 36px;
  padding: 12px;
  background: linear-gradient(180deg, #162233 0%, #0a1018 100%);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.42);
  transform: rotate(-11deg);
  position: relative;
  z-index: 1;
}

.phone-inner {
  width: 100%;
  height: 100%;
  border-radius: 28px;
  background: linear-gradient(180deg, #09111d 0%, #0b1625 100%);
  padding: 22px 18px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(145, 181, 230, 0.12);
}

.phone-notch {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 88px;
  height: 18px;
  border-radius: 0 0 14px 14px;
  background: #060b13;
}

.qr-box {
  margin-top: 34px;
  width: 100%;
  aspect-ratio: 1;
  background:
    linear-gradient(45deg, #ffffff 25%, #0b1625 25%, #0b1625 50%, #ffffff 50%, #ffffff 75%, #0b1625 75%),
    linear-gradient(45deg, #ffffff 25%, #0b1625 25%, #0b1625 50%, #ffffff 50%, #ffffff 75%, #0b1625 75%);
  background-size: 28px 28px;
  background-position: 0 0, 14px 14px;
  border-radius: 18px;
  border: 8px solid #fff;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
}

.phone-label {
  text-align: center;
  margin-top: 16px;
  color: #bfd1e6;
  font-size: 0.9rem;
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.benefit-card {
  padding: 24px;
  min-height: 220px;
}

.benefit-card h4 {
  font-size: 1.16rem;
  margin-bottom: 12px;
  letter-spacing: -0.03em;
}

.benefit-card p {
  color: var(--muted);
  line-height: 1.75;
}

.cta-band {
  margin-top: 22px;
  padding: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.cta-band h4 {
  font-size: clamp(1.8rem, 3vw, 3rem);
  line-height: 1;
  letter-spacing: -0.05em;
  margin-bottom: 10px;
}

.cta-band p {
  color: var(--muted);
  line-height: 1.7;
  max-width: 520px;
}

.cta-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 16px;
}

.stat-chip {
  border-radius: 18px;
  padding: 16px 18px;
  background: rgba(9, 16, 27, 0.84);
  border: 1px solid rgba(132, 168, 220, 0.09);
  text-align: center;
}

.stat-chip strong {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 6px;
  letter-spacing: -0.05em;
}

.stat-chip span {
  color: var(--muted);
  font-size: 0.9rem;
}
