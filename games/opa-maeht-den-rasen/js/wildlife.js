import { WORLD_WIDTH, WORLD_HEIGHT, DECORATIONS } from "./world.js";

function randomPointInWorld(margin = 120) {
  return {
    x: margin + Math.random() * (WORLD_WIDTH - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
  };
}

function createWanderer(speed, margin) {
  const start = randomPointInWorld(margin);
  return {
    x: start.x,
    y: start.y,
    targetX: start.x,
    targetY: start.y,
    speed,
    phase: Math.random() * Math.PI * 2,
  };
}

function updateWanderer(entity, delta, margin) {
  const dx = entity.targetX - entity.x;
  const dy = entity.targetY - entity.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 12) {
    const next = randomPointInWorld(margin);
    entity.targetX = next.x;
    entity.targetY = next.y;
  } else {
    entity.x += (dx / distance) * entity.speed * delta;
    entity.y += (dy / distance) * entity.speed * delta;
  }

  entity.phase += delta * 6;
}

function flowerAnchors() {
  const anchors = DECORATIONS.filter((deco) => deco.type === "flowerbed").map((deco) => ({
    x: deco.x + deco.w / 2,
    y: deco.y + deco.h / 2,
  }));
  return anchors.length ? anchors : [{ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }];
}

export function createWildlife() {
  const butterflies = Array.from({ length: 5 }, () => createWanderer(34, 100));
  const ladybugs = Array.from({ length: 4 }, () => ({ ...createWanderer(14, 150), groundY: 0 }));
  const anchors = flowerAnchors();
  const bees = Array.from({ length: 3 }, (_, index) => {
    const anchor = anchors[index % anchors.length];
    return {
      anchorX: anchor.x,
      anchorY: anchor.y,
      angle: Math.random() * Math.PI * 2,
      radius: 60 + Math.random() * 50,
      speed: 1.4 + Math.random() * 0.6,
      x: anchor.x,
      y: anchor.y,
    };
  });

  const birds = Array.from({ length: 3 }, () => createBird());
  const clouds = Array.from({ length: 4 }, (_, index) => ({
    x: Math.random() * WORLD_WIDTH,
    y: 40 + index * 70 + Math.random() * 60,
    width: 220 + Math.random() * 160,
    speed: 6 + Math.random() * 6,
  }));

  function createBird() {
    const point = randomPointInWorld(160);
    return {
      x: point.x,
      y: point.y,
      state: "landed",
      timer: 2 + Math.random() * 3,
      targetX: point.x,
      targetY: point.y,
      bob: Math.random() * Math.PI * 2,
    };
  }

  function update(delta) {
    for (const butterfly of butterflies) updateWanderer(butterfly, delta, 100);
    for (const ladybug of ladybugs) updateWanderer(ladybug, delta, 150);

    for (const bee of bees) {
      bee.angle += bee.speed * delta;
      bee.x = bee.anchorX + Math.cos(bee.angle) * bee.radius;
      bee.y = bee.anchorY + Math.sin(bee.angle * 1.3) * bee.radius * 0.6;
    }

    for (const bird of birds) {
      bird.bob += delta * 5;
      bird.timer -= delta;

      if (bird.state === "landed" && bird.timer <= 0) {
        const next = randomPointInWorld(160);
        bird.state = "flying";
        bird.targetX = next.x;
        bird.targetY = next.y;
      } else if (bird.state === "flying") {
        const dx = bird.targetX - bird.x;
        const dy = bird.targetY - bird.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 10) {
          bird.state = "landed";
          bird.timer = 3 + Math.random() * 4;
        } else {
          bird.x += (dx / distance) * 150 * delta;
          bird.y += (dy / distance) * 150 * delta;
        }
      }
    }

    for (const cloud of clouds) {
      cloud.x += cloud.speed * delta;
      if (cloud.x - cloud.width > WORLD_WIDTH) {
        cloud.x = -cloud.width;
        cloud.y = 40 + Math.random() * 240;
      }
    }
  }

  return { butterflies, ladybugs, bees, birds, clouds, update };
}
