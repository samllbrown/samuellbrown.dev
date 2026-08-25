---
title: The collie is the algorithm
publishDate: 2026-08-25 00:00:00
description: |
  A sheepdog's whole strategy fits in two rules. I built the simulation, then made the sheep awkward and the field difficult, and raced the dog. Play along. It's harder than it looks.
tags:
  - Farming
  - Simulation
  - AI
---

I love collies. On my most recent holiday to North Devon we went to a falconry and sheepdog show, and I watched a collie work what I can only describe as magic: one dog, a scattered flock, a shepherd giving the odd whistle, and a minute later every sheep was in a pen that none of them wanted to be in. I got a question I couldn't put down.

I've always joked that collies are better than maths because they have *instinct*, and that whatever is going on in that dog, you couldn't write it down. It turns out someone tried. In 2014 a team from Swansea University, the Royal Veterinary College and Uppsala fitted 46 sheep and a working farm dog with GPS backpacks, recorded them, and asked: what's the *least* a simulated dog needs to know to reproduce those tracks?

The answer was two rules. I found that hard to believe, so I built it. Then I made it harder.

## Demo 1: The paper

The model exactly as published. Thirty sheep, an open field, a pen. The purple arrow is the dog, running two rules. Watch the status line flip between **COLLECT** and **DRIVE**. The dashed circle is the flock's "cohesive enough" radius; the small ring is where the dog has decided to go *this instant*.

Then hit **You drive** and be the dog yourself on the same flock. Your time goes on the board.

<div class="sheepdog" data-sheepdog="paper">
  <canvas aria-label="Sheepdog simulation: the two-rule model on an open field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

Here's the entire dog:

```js title="collie.js"
const gcm = centreOfMass(loose);
const straggler = furthestFrom(gcm, loose);

if (dist(straggler, gcm) > R_A * Math.pow(loose.length, 2 / 3)) {
  // COLLECT: stand just beyond the straggler, so running from the dog
  // means running back to the flock.
  return pointBeyond(straggler, awayFrom(gcm));
}
// DRIVE: stand behind the flock, on the far side from the pen, and push.
return pointBeyond(gcm, awayFrom(pen));
```

It doesn't plan and it doesn't remember anything. Sixty times a second it asks whether the flock is tight enough, and runs to wherever the answer says. The sheep are just as simple: away from the dog, towards the neighbours, not too close to the neighbours, a bit of noise. The flocking you see comes from nothing more than that.

Most people can beat this dog. You can see the whole field, and you don't have to stop when you get close to a sheep. The collie does, because the real one did. You may also notice it doing something no real collie would: cutting across the *front* of the flock on its way to a straggler. Hold that thought.

## Demo 2: Sheep with minds of their own

Real sheep aren't identical, so these have personalities:

- **Leaders** (orange ring) go where they like, and the flock drifts after them.
- **Loners** hang off the edge and spook early.
- **Old ewes** (grey) stand their ground. The dog has to come in close, stop, and eye them until they decide to move.
- **Flighty ones** bolt early and overshoot.

The paper's dog on this flock ran full circles, crossing between the sheep and the pen a fifth of the time. A real collie works the **far side**: it changes sides by going round the *back*, leaves alone a sheep that's already ahead, and finishes gathering one sheep before starting on another. So this dog has been given that sense of side (**FLANK** on the status line), and some manners: it stands off, creeps in, and never touches a sheep. It's also a young dog, running at 80% pace.

<div class="sheepdog" data-sheepdog="minds">
  <canvas aria-label="Sheepdog simulation: sheep with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

The surprise: loners and leaders cost the dog nothing. "Fetch the furthest sheep" already finds the troublemaker, because the troublemaker *is* the furthest sheep. The old ewes are what slow it down. They'll slow you down too.

## Demo 3: The field fights back

The paper has no obstacles, and its dog has no idea what one is: put a pond in the way and it presses against it until random noise slides it off, if it ever does. So I gave the dog a third rule, as dumb as the first two: **if the line to where you want to be crosses something, aim for its edge** (**GO ROUND**). The sheep get no rule at all. They're just pushed back by things, and the flock flows round like water.

<div class="sheepdog" data-sheepdog="field">
  <canvas aria-label="Sheepdog simulation: a field with a pond, wall and trees"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

On thirty identical fields the paper's dog got stuck three times; this one never did. When the paper's dog does get through it's no slower. The third rule doesn't make the dog faster. It makes it not get stuck.

## Demo 4: The whole farm

Sixty sheep, personalities, obstacles, full pace. If you beat the dog here first go, send me the recording.

<div class="sheepdog" data-sheepdog="farm">
  <canvas aria-label="Sheepdog simulation: sixty sheep with personalities on an obstacle field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 60 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-mode="collie">Watch the collie</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Collie <b data-role="collie">–</b></span>
    <span>You <b data-role="you">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

The dog wins here because it never chases a sheep for its own sake: only the furthest one, and only when the flock is loose enough to matter. A human chases stragglers, which is exactly what makes a flock split. Median 33 seconds over thirty runs, though about one flock in thirty still has it at work after a few minutes. That's what **New flock** is for.

## What I learned

- **Sticking together is the sheep's job.** If each sheep watches fewer than half the flock, no dog can pen them. Every failure I blamed on the dog was a property of the sheep.
- **The pen needs a funnel and a gate.** Both are things the farmer provides. The dog was never meant to do the whole job.
- **Which way round matters.** The paper's dog cuts across the front of the flock. Going round the back instead took the worst case from two minutes to one.
- **Manners made it faster.** Standing off and never touching a sheep were added because the dog *looked* wrong. They halved the worst-case times, because a dog that doesn't barge doesn't pin sheep against walls.
- **Most failures were dithering, not wrong rules.** Two stragglers, each marginally the furthest in turn. Every fix was *commitment*: pick a sheep and finish it, pick a way round and take it.

So my joke was wrong, but only just. The collie isn't better than maths. The collie *is* the maths, bred into it over a few hundred years until it became instinct.

We write three-thousand-word instructions for systems that, when you watch what actually made the difference, needed two lines. Next time I reach for a planning layer I'm going to spend an afternoon watching the thing work first, and ask what the two rules are.

<script src="/sim/sheepdog.js" data-astro-rerun></script>
<style>
  .sheepdog { margin: 1.5rem 0; }
  .sheepdog canvas {
    display: block; width: 100%; touch-action: none; cursor: crosshair;
    border-radius: 1rem; border: 1px solid var(--gray-800); background: #0e1711;
  }
  .sheepdog-hud {
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-stats { color: var(--gray-400); white-space: nowrap; }
  .sheepdog-controls {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.6rem; font-size: var(--text-sm);
  }
  .sheepdog-controls button {
    font: inherit; padding: 0.35rem 0.8rem; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200);
  }
  .sheepdog-controls button[aria-pressed="true"] { border-color: var(--accent-dark); color: var(--accent-dark); }
  .sheepdog-controls button:hover { border-color: var(--gray-500); }
  .sheepdog-controls label { margin-left: auto; color: var(--gray-400); display: flex; gap: 0.35rem; align-items: center; cursor: pointer; }
  .sheepdog-board {
    display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: baseline; margin-top: 0.6rem;
    font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-board b { color: var(--gray-0); font-weight: 600; }
  .sheepdog-verdict { color: var(--accent-dark); }
  .sheepdog-traits { margin-top: 0.4rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-400); }
</style>

---

*Source: Strömbom D., Mann R.P., Wilson A.M., Hailes S., Morton A.J., Sumpter D.J.T. & King A.J. (2014). [Solving the shepherding problem: heuristics for herding autonomous, interacting agents](https://royalsocietypublishing.org/doi/10.1098/rsif.2014.0719). J. R. Soc. Interface 11: 20140719. The personalities, obstacles, flanking and third rule are my additions. [Simulation code](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/sheepdog.js).*
