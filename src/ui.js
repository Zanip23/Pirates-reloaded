// Shared pixel-style UI building blocks so every screen looks the same.

export const COLORS = {
  panel: 0x14283c,
  panelEdge: 0xe8b850,
  btn: 0x1d3a54,
  btnEdge: 0x46c2e2,
  btnGood: 0x1d5430,
  btnGoodEdge: 0x5ce07a,
  btnBad: 0x542020,
  btnBadEdge: 0xe06060,
  btnGold: 0x6a5212,
  btnGoldEdge: 0xffd23f,
  btnDisabled: 0x26303a,
  btnDisabledEdge: 0x4a565f,
};

export const FONT = 'Courier New, monospace';

export function textStyle(size, color, extra = {}) {
  return {
    fontSize: `${size}px`,
    fontFamily: FONT,
    fontStyle: 'bold',
    color,
    stroke: '#0a1420',
    strokeThickness: Math.max(2, Math.round(size / 6)),
    ...extra,
  };
}

// A chunky pixel button: shadow block + face + border + label.
export function makeButton(scene, x, y, w, h, label, variant, onClick) {
  const v = {
    normal: [COLORS.btn, COLORS.btnEdge],
    good:   [COLORS.btnGood, COLORS.btnGoodEdge],
    bad:    [COLORS.btnBad, COLORS.btnBadEdge],
    gold:   [COLORS.btnGold, COLORS.btnGoldEdge],
    disabled: [COLORS.btnDisabled, COLORS.btnDisabledEdge],
  }[variant] || [COLORS.btn, COLORS.btnEdge];

  const c = scene.add.container(x, y);
  const shadow = scene.add.rectangle(3, 4, w, h, 0x0a1420, 0.8).setOrigin(0.5);
  const face = scene.add.rectangle(0, 0, w, h, v[0]).setOrigin(0.5);
  face.setStrokeStyle(2, v[1]);
  const txt = scene.add.text(0, 0, label, textStyle(Math.min(15, h * 0.4), '#ffffff')).setOrigin(0.5);
  c.add([shadow, face, txt]);
  c.setSize(w, h);

  if (variant !== 'disabled' && onClick) {
    let pressed = false;
    const release = () => {
      if (!pressed) return;
      pressed = false;
      c.y -= 2;
      shadow.setPosition(3, 4);
    };
    face.setInteractive({ useHandCursor: true });
    face.on('pointerover', () => face.setFillStyle(Phaser.Display.Color.ValueToColor(v[0]).brighten(18).color));
    face.on('pointerout',  () => { face.setFillStyle(v[0]); release(); });
    face.on('pointerdown', () => { pressed = true; c.y += 2; shadow.setPosition(3, 2); });
    face.on('pointerup',   () => { release(); onClick(); });
  } else {
    txt.setColor('#7a868f');
  }

  c.face = face;
  c.label = txt;
  return c;
}

export function makePanel(scene, x, y, w, h) {
  const c = scene.add.container(0, 0);
  const shadow = scene.add.rectangle(x + 5, y + 6, w, h, 0x0a1420, 0.7).setOrigin(0, 0);
  const bg = scene.add.rectangle(x, y, w, h, COLORS.panel, 0.97).setOrigin(0, 0);
  bg.setStrokeStyle(3, COLORS.panelEdge);
  const inner = scene.add.rectangle(x + 4, y + 4, w - 8, h - 8, 0x000000, 0).setOrigin(0, 0);
  inner.setStrokeStyle(1, 0x2c4a64);
  bg.setInteractive(); // swallow clicks under the panel
  c.add([shadow, bg, inner]);
  return c;
}

export function showToast(scene, msg, color = '#ffd23f') {
  const W = scene.scale.width;
  const t = scene.add.text(W / 2, scene.scale.height * 0.3, msg,
    textStyle(15, color, { backgroundColor: '#0a1420dd', padding: { x: 10, y: 6 } })
  ).setOrigin(0.5).setScrollFactor(0).setDepth(200);
  scene.tweens.add({
    targets: t, alpha: 0, y: t.y - 36, duration: 1900, ease: 'Power2',
    onComplete: () => t.destroy(),
  });
}
