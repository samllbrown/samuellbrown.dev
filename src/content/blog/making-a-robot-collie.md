---
title: Making a robot collie
publishDate: 2026-08-27 00:00:00
description: |
  Last time I wrote the sheepdog's rules by hand. This time I gave the dog a small neural network and let it work the rules out for itself, one generation at a time. You can evolve one in your browser, race the fastest one I found, watch it struggle on a harder field, train it for that field, look at what it's thinking while it runs, and then watch it think side by side with the best dog an hour of evolution could make.
tags:
  - Farming
  - Simulation
  - AI
---

In [the last post](/blog/the-collie-is-the-algorithm/) I built a sheepdog out of two rules from a paper. This time I wanted to see if a dog could work the rules out for itself. Not the usual way, with a pile of data and gradient descent, because that's not how real collies got good at it. They got good at it by the ones that could do the job having puppies. So I did that, in a simulation.

The dog is a small neural network. It gets told where things are and it says which way to run and how fast. It doesn't know the two rules, it doesn't know what a pen is, and nobody tells it when it's done well. Every generation I run a batch of them, keep the ones that got the most sheep in, mix their brains with a few random changes, and go again.

## What the dog gets

The same body as the hand-written collie: it can't run faster, it can't turn faster (about a third of a turn a second), and it can't get closer than two sheep-widths to a sheep. Those are done by the world. Everything else it has to learn. It can see seventeen numbers, all measured from where it's standing:

<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>what it sees</th><th>why I gave it that</th></tr></thead>
<tbody>
<tr><td>where the middle of the flock is</td><td>the paper's dog pushes the middle</td></tr>
<tr><td>where the sheep furthest from the middle is</td><td>the paper's dog fetches that one</td></tr>
<tr><td>which way the pen is from the flock</td><td>it has to push them somewhere</td></tr>
<tr><td>how spread out the flock is</td><td>the paper's whole switch between collect and drive runs on this</td></tr>
<tr><td>how many sheep are still loose</td><td>so it can tell the end from the start</td></tr>
<tr><td>where the nearest sheep is, and how far</td><td>so it can keep its distance</td></tr>
<tr><td>where the nearest obstacle is, and how far</td><td>so it has a chance on the field with the pond</td></tr>
<tr><td>how fast the nearest sheep is moving</td><td>so it can tell a sheep that's standing its ground from one that's going</td></tr>
<tr><td>how fast the flock is moving</td><td>so it can tell whether what it's doing is working</td></tr>
</tbody></table></div>

Those go through ten neurons and come out as a direction and a speed. Two hundred weights, and the weights are the whole dog.

```js title="dog.js"
// 17 inputs → 10 hidden → 3 outputs.
h = tanh(W1 · inputs);
[dx, dy, speed] = W2 · [h, 1];
run(normalise(dx, dy), sigmoid(speed));
```

A dog's score on a flock is sheep penned, plus a bonus for finishing quickly, plus a bit for how close the loose ones got, so that early on, when nobody gets any in, the dogs that at least push the flock the right way come out ahead. Every generation gets fresh flocks, the same ones for every dog.

## Why not train it the usual way

- **There are no right answers to show it.** Nobody has a recording of what a perfect sheepdog does at every moment. All you get is one number at the end of a run, forty seconds after the decisions that earned it. You can do gradients with that (it's reinforcement learning) but it takes a lot of machinery.
- **You can't take a gradient through the sheep.** Walls stop you dead, sheep either spook or don't, and there's noise in every step. None of that has a slope.
- **The dog is tiny.** Two hundred numbers. Trying variations and keeping the better ones is fine at that size, and it's the search real collies were found by.

It isn't cheap. The open-field dog took about twenty thousand trial runs to find its two hundred numbers, and a gradient method would get there in a fraction of that if it could be made to work. But you can watch it happen.

## Basic evolution

Thirty-two dogs with random brains, evolved in your browser. Pick how many generations, press Evolve, and it runs them and stops. The field shows the best dog of the latest generation on a fixed flock; the chart is the best score and the batch average, and 1 is every sheep in.

The first few generations are the good bit. Dogs run in circles, sit in a corner, or push the flock the wrong way. Then one of them gets behind the flock by accident, the score jumps, and the batch fills up with its descendants.

<div class="sheepdog robot-evolve" data-robot-collie="paper" data-pop="32" data-flocks="2">
  <canvas class="robot-field" aria-label="The best dog of the latest generation working a flock"></canvas>
  <div class="sheepdog-hud robot-hud-fixed">
    <span data-role="label">nothing evolved yet</span>
    <span class="sheepdog-stats"><span data-role="gen">generation 0</span> · <span data-role="best">best –</span></span>
  </div>
  <div class="sheepdog-hud robot-hud-fixed">
    <span data-role="status">lie down</span>
  </div>
  <div class="sheepdog-controls">
    <label class="robot-gens">generations <select data-role="gens"><option value="25">25</option><option value="50" selected>50</option><option value="100">100</option><option value="200">200</option></select></label>
    <button type="button" data-action="start">Evolve</button>
    <button type="button" data-action="reset">Start again</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <canvas class="robot-chart" data-role="chart" aria-label="Score by generation"></canvas>
  <div class="robot-legend"><span><i style="background:#a93fe0"></i>best dog</span><span><i style="background:#c97c12"></i>batch average</span></div>
</div>

Fifty generations usually gets you a dog that pens the lot. Start again gives you a new batch, and they don't all find the same trick.

## The fastest dog found

The best one I got, evolved properly on a machine: three batches of forty-eight, a hundred and fifty generations, finalists re-tested on thirty flocks none of them had seen. The buttons are the robot collie, the paper's two-rule dog exactly as published, and you.

<details class="demo-box">
<summary><span class="demo-title">The robot collie on the open field</span><span class="demo-desc">Robot collie vs the paper's dog vs you. Thirty sheep, nothing in the way.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="paper" data-brain="open" data-autostart="brain">
  <canvas aria-label="Sheepdog simulation: the robot collie on an open field"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain" data-name="the robot collie">Watch the robot collie</button>
    <button type="button" data-mode="collie" data-name="the paper's dog">Watch the paper's dog</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Robot collie <b data-time="brain:open">–</b></span>
    <span>Paper's dog <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

</details>

Over sixty fresh flocks it penned the lot every time, median 11.1 seconds and worst 14.9, against 16.1 and 32.3 for the paper's dog and 12.5 and 17.6 for the collie I wrote by hand last time. It stays behind the flock the whole time, runs flat out, and never fetches a straggler. It gets behind the flock in line with the pen and pushes, and on this field that's enough.

## Away from home

The same dog on the two harder fields from last time, against my hand-written collie (the one with flanking and the third rule, not the paper's dog). I've taken the old ewes out of the awkward flock for this post: they're a party trick for a dog with a rule for them. So the first flock has leaders, loners and flighty sheep, and the second field has the pond, the wall and the trees.

<details class="demo-box">
<summary><span class="demo-title">The open-field dog on the awkward flock</span><span class="demo-desc">Leaders, loners and flighty sheep. It has never seen any of them.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="awkward" data-brain="open">
  <canvas aria-label="Sheepdog simulation: the open-field robot collie on a flock with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

</details>

<details class="demo-box">
<summary><span class="demo-title">The open-field dog on the obstacle field</span><span class="demo-desc">A pond, a wall and trees. It has never seen those either.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="field" data-brain="open">
  <canvas aria-label="Sheepdog simulation: the open-field robot collie on a field with a pond, wall and trees"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

</details>

Forty-five full pens out of sixty on the awkward flock, and what beats it is the leader: it takes a few sheep off, and this dog never goes after anyone. The obstacle field it mostly copes with, 54 out of 60, because the sheep flow round the pond and the wall on their own and a dog pushing from behind gets carried round with them. When it fails there, it's pressed against the wall with the flock on the other side, which is what the paper's dog did with the pond last time.

## Training it on the harder fields

The fix is the one that made real collies: put the harder fields in the training. This dog was evolved on the awkward flock and the obstacle field, turn and turn about, two hundred generations, and never saw the open field. Then the farm, which neither dog has seen: sixty awkward sheep and all the obstacles. The buttons are the retrained dog ("farm dog"), the open-field dog, my collie and you.

<details class="demo-box">
<summary><span class="demo-title">The retrained dog on the awkward flock</span><span class="demo-desc">Same flock as above, with the dog that was trained for it.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="awkward" data-brain="farm" data-autostart="brain:farm">
  <canvas aria-label="Sheepdog simulation: the farm-trained robot collie on a flock with personalities"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 36 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:farm" data-name="the farm dog">Watch the farm dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Farm dog <b data-time="brain:farm">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

</details>

<details class="demo-box">
<summary><span class="demo-title">The retrained dog on the obstacle field</span><span class="demo-desc">Same field as above, with the dog that was trained for it.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="field" data-brain="farm">
  <canvas aria-label="Sheepdog simulation: the farm-trained robot collie on a field with a pond, wall and trees"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 30 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:farm" data-name="the farm dog">Watch the farm dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Farm dog <b data-time="brain:farm">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
</div>

</details>

<details class="demo-box">
<summary><span class="demo-title">The retrained dog on the farm</span><span class="demo-desc">Sixty awkward sheep and all the obstacles. Neither dog has seen this field.</span><span class="demo-open">open the demo</span></summary>
<div class="sheepdog" data-sheepdog="farm2" data-brain="farm">
  <canvas aria-label="Sheepdog simulation: the farm-trained robot collie on the full farm"></canvas>
  <div class="sheepdog-hud">
    <span data-role="status">lie down</span>
    <span class="sheepdog-stats"><span data-role="count">0 / 60 penned</span> · <span data-role="time">0.0s</span></span>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-mode="brain:farm" data-name="the farm dog">Watch the farm dog</button>
    <button type="button" data-mode="brain:open" data-name="the open-field dog">Watch the open-field dog</button>
    <button type="button" data-mode="collie" data-name="my collie">Watch my collie</button>
    <button type="button" data-mode="manual">You drive</button>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="sheepdog-board">
    <span>Farm dog <b data-time="brain:farm">–</b></span>
    <span>Open-field dog <b data-time="brain:open">–</b></span>
    <span>My collie <b data-time="collie">–</b></span>
    <span>You <b data-time="manual">–</b></span>
    <span class="sheepdog-verdict" data-role="verdict"></span>
  </div>
  <div class="sheepdog-traits" data-role="traits"></div>
</div>

</details>

On the obstacle field it's as good as the collie now: sixty out of sixty. On the awkward flock it goes from forty-five to fifty-seven, a second and a half behind the collie. The farm it gets thirty-nine times out of sixty, with fifty-one of the sixty sheep in on average, where the open-field dog managed twelve. Not the collie, but a working dog.

## What it's thinking

The paper's dog tells you what it's doing: the status line says COLLECT or DRIVE. The robot collie doesn't have those words, it has ten neurons and a direction coming out. So this shows you the lot while it runs: what it can see, the ten neurons, and the direction and speed it chose. The line under the field is my attempt to read it in the paper's terms. If the direction it picked points at the spot the paper's dog would run to for COLLECT, it says COLLECT; for DRIVE, DRIVE; and if it's going somewhere the paper's dog wouldn't, neither.

<div class="sheepdog robot-thoughts" data-robot-thoughts="paper" data-brain="open">
  <div class="robot-thoughts-main">
    <div class="robot-thoughts-field">
      <canvas class="robot-field" aria-label="The robot collie working a flock, with its network shown alongside"></canvas>
      <div class="sheepdog-hud">
        <span data-role="status">lie down</span>
      </div>
      <div class="sheepdog-hud">
        <span data-role="tally"></span>
      </div>
    </div>
    <div class="robot-thoughts-panel">
      <div class="robot-label">what it sees</div>
      <div class="robot-bars" data-role="inputs"></div>
      <div class="robot-label">the ten neurons</div>
      <div class="robot-bars" data-role="hidden"></div>
      <div class="robot-label">what it decided</div>
      <div class="robot-out" data-role="outputs"></div>
    </div>
  </div>
  <div class="sheepdog-controls">
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
</div>

Two things stand out. First, a third of the time it isn't doing either of the paper's rules: it reads as DRIVE about 40% of the time and COLLECT about 30%, and the rest it's going wide round the side of the flock, which is how it gets behind them without cutting across the front. Tick "workings" and you can see it: C and D are the two spots the paper's dog would be running to, the white line is where this dog is going. Second, which neurons do the work. Three of the ten sit pinned at 1 or −1 the whole run. The heading mostly comes from h7, which has the biggest weights on the output, and if you watch it against "nearest d" you can more or less see the rule: keep the nearest sheep at the distance it likes, and go.

## The numbers

Everything here is from the script in the repo, on the same code as the demos, with seeded flocks. A score over 2 is every sheep in and fast.

<figure class="robot-figure" data-chart="learning-open">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Score of the best dog and of the batch average, by generation, for each run (open field)" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Score of the best dog and of the batch average, by generation, for each run (open field)</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.14)"/><text x="36" y="142.6" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<line x1="44" x2="624" y1="45.2" y2="45.2" stroke="rgba(255,255,255,0.14)"/><text x="36" y="45.2" fill="#8490b5" text-anchor="end" dominant-baseline="middle">2</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="430.7" y="258" fill="#8490b5" text-anchor="middle">100</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">150</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="44" x2="624" y1="142.6" y2="142.6" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">generation</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">score (1 = every sheep in)</text>
<path d="M47.9 223.5 L51.7 203.6 L55.6 221.6 L59.5 221.4 L63.3 221.4 L67.2 220.4 L71.1 161.4 L74.9 165.0 L78.8 221.5 L82.7 222.5 L86.5 220.7 L90.4 219.7 L94.3 220.8 L98.1 219.2 L102.0 219.8 L105.9 220.3 L109.7 220.6 L113.6 219.4 L117.5 218.9 L121.3 218.9 L125.2 218.4 L129.1 219.3 L132.9 219.8 L136.8 218.1 L140.7 221.5 L144.5 220.8 L148.4 214.4 L152.3 220.0 L156.1 209.3 L160.0 220.3 L163.9 207.5 L167.7 219.7 L171.6 219.9 L175.5 215.7 L179.3 219.3 L183.2 220.1 L187.1 220.7 L190.9 216.7 L194.8 220.0 L198.7 221.1 L202.5 217.9 L206.4 205.4 L210.3 219.5 L214.1 219.2 L218.0 220.9 L221.9 220.9 L225.7 221.0 L229.6 219.6 L233.5 219.4 L237.3 214.8 L241.2 219.9 L245.1 219.5 L248.9 219.3 L252.8 220.1 L256.7 218.9 L260.5 220.5 L264.4 220.0 L268.3 213.7 L272.1 174.0 L276.0 201.1 L279.9 216.2 L283.7 220.3 L287.6 219.5 L291.5 219.2 L295.3 216.1 L299.2 195.1 L303.1 208.7 L306.9 218.7 L310.8 219.3 L314.7 197.9 L318.5 216.8 L322.4 219.0 L326.3 218.0 L330.1 201.6 L334.0 217.6 L337.9 194.4 L341.7 206.0 L345.6 210.1 L349.5 221.3 L353.3 215.9 L357.2 217.0 L361.1 220.3 L364.9 202.6 L368.8 220.0 L372.7 219.9 L376.5 218.9 L380.4 220.3 L384.3 218.8 L388.1 213.9 L392.0 217.2 L395.9 214.5 L399.7 200.3 L403.6 167.2 L407.5 219.4 L411.3 209.7 L415.2 191.3 L419.1 221.0 L422.9 170.9 L426.8 205.1 L430.7 148.5 L434.5 200.6 L438.4 205.4 L442.3 202.5 L446.1 203.1 L450.0 200.3 L453.9 188.9 L457.7 168.5 L461.6 152.3 L465.5 174.8 L469.3 188.7 L473.2 201.8 L477.1 193.7 L480.9 125.7 L484.8 78.2 L488.7 177.8 L492.5 174.5 L496.4 128.7 L500.3 177.2 L504.1 123.2 L508.0 137.4 L511.9 94.5 L515.7 66.7 L519.6 111.0 L523.5 142.9 L527.3 119.0 L531.2 95.0 L535.1 106.3 L538.9 93.2 L542.8 116.3 L546.7 42.8 L550.5 63.4 L554.4 57.3 L558.3 49.9 L562.1 111.0 L566.0 63.1 L569.9 52.3 L573.7 66.5 L577.6 60.9 L581.5 59.9 L585.3 55.2 L589.2 49.4 L593.1 63.0 L596.9 57.0 L600.8 50.7 L604.7 47.2 L608.5 51.3 L612.4 49.7 L616.3 49.6 L620.1 41.4 L624.0 46.4" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 1, best dog</title></path>
<path d="M47.9 227.7 L51.7 226.7 L55.6 226.8 L59.5 226.7 L63.3 226.1 L67.2 226.1 L71.1 224.1 L74.9 223.5 L78.8 226.0 L82.7 225.9 L86.5 225.3 L90.4 224.8 L94.3 225.2 L98.1 224.1 L102.0 225.3 L105.9 224.3 L109.7 224.5 L113.6 223.8 L117.5 223.3 L121.3 223.9 L125.2 223.9 L129.1 224.1 L132.9 223.5 L136.8 224.1 L140.7 225.1 L144.5 224.0 L148.4 222.7 L152.3 223.0 L156.1 221.3 L160.0 223.6 L163.9 223.1 L167.7 223.6 L171.6 222.5 L175.5 224.0 L179.3 222.8 L183.2 223.2 L187.1 223.4 L190.9 222.6 L194.8 224.0 L198.7 223.0 L202.5 222.8 L206.4 222.6 L210.3 223.3 L214.1 222.6 L218.0 224.2 L221.9 222.6 L225.7 224.4 L229.6 223.1 L233.5 222.8 L237.3 223.0 L241.2 223.9 L245.1 222.8 L248.9 223.1 L252.8 222.2 L256.7 221.3 L260.5 223.6 L264.4 222.0 L268.3 221.6 L272.1 219.8 L276.0 222.8 L279.9 223.7 L283.7 225.5 L287.6 222.3 L291.5 223.0 L295.3 223.3 L299.2 222.5 L303.1 222.2 L306.9 222.8 L310.8 224.0 L314.7 221.0 L318.5 223.9 L322.4 222.4 L326.3 221.8 L330.1 221.1 L334.0 222.8 L337.9 220.5 L341.7 221.5 L345.6 221.8 L349.5 223.6 L353.3 222.2 L357.2 222.2 L361.1 221.8 L364.9 221.4 L368.8 222.7 L372.7 223.8 L376.5 222.3 L380.4 223.2 L384.3 222.9 L388.1 221.5 L392.0 222.1 L395.9 222.0 L399.7 220.8 L403.6 211.2 L407.5 225.8 L411.3 221.3 L415.2 220.4 L419.1 224.7 L422.9 219.1 L426.8 224.2 L430.7 208.6 L434.5 222.3 L438.4 222.1 L442.3 222.8 L446.1 222.5 L450.0 220.1 L453.9 218.1 L457.7 217.7 L461.6 214.1 L465.5 216.6 L469.3 220.5 L473.2 219.7 L477.1 221.2 L480.9 216.3 L484.8 201.0 L488.7 215.8 L492.5 213.6 L496.4 201.9 L500.3 220.0 L504.1 212.1 L508.0 217.9 L511.9 197.1 L515.7 209.6 L519.6 210.9 L523.5 213.1 L527.3 209.0 L531.2 199.9 L535.1 192.1 L538.9 187.7 L542.8 194.1 L546.7 154.7 L550.5 188.6 L554.4 159.7 L558.3 170.6 L562.1 200.1 L566.0 186.0 L569.9 186.3 L573.7 174.0 L577.6 184.7 L581.5 173.8 L585.3 182.0 L589.2 166.6 L593.1 187.9 L596.9 180.7 L600.8 191.9 L604.7 170.9 L608.5 174.2 L612.4 148.9 L616.3 166.0 L620.1 160.5 L624.0 156.1" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 1, batch average</title></path>
<path d="M47.9 223.2 L51.7 221.0 L55.6 220.3 L59.5 170.2 L63.3 106.7 L67.2 221.7 L71.1 200.9 L74.9 161.7 L78.8 159.8 L82.7 176.9 L86.5 103.4 L90.4 167.2 L94.3 199.3 L98.1 116.1 L102.0 171.8 L105.9 115.7 L109.7 75.2 L113.6 104.3 L117.5 165.2 L121.3 164.6 L125.2 130.8 L129.1 136.8 L132.9 123.0 L136.8 147.6 L140.7 101.5 L144.5 99.5 L148.4 97.4 L152.3 107.0 L156.1 88.4 L160.0 75.5 L163.9 73.5 L167.7 50.5 L171.6 69.8 L175.5 46.8 L179.3 43.3 L183.2 46.4 L187.1 47.5 L190.9 42.5 L194.8 45.9 L198.7 43.8 L202.5 53.5 L206.4 42.1 L210.3 44.8 L214.1 41.2 L218.0 45.1 L221.9 40.4 L225.7 43.0 L229.6 44.1 L233.5 45.4 L237.3 43.0 L241.2 46.7 L245.1 44.8 L248.9 43.1 L252.8 41.1 L256.7 44.7 L260.5 40.9 L264.4 44.6 L268.3 41.0 L272.1 42.4 L276.0 41.4 L279.9 41.7 L283.7 46.3 L287.6 42.6 L291.5 45.3 L295.3 44.2 L299.2 41.1 L303.1 44.0 L306.9 42.2 L310.8 43.0 L314.7 41.5 L318.5 44.4 L322.4 40.9 L326.3 41.2 L330.1 43.3 L334.0 44.0 L337.9 41.3 L341.7 42.7 L345.6 40.4 L349.5 42.3 L353.3 43.2 L357.2 42.1 L361.1 42.7 L364.9 41.2 L368.8 41.0 L372.7 39.6 L376.5 42.4 L380.4 44.0 L384.3 40.5 L388.1 42.8 L392.0 43.1 L395.9 41.6 L399.7 43.8 L403.6 39.1 L407.5 44.5 L411.3 41.6 L415.2 43.6 L419.1 42.1 L422.9 40.3 L426.8 41.8 L430.7 38.5 L434.5 39.8 L438.4 43.5 L442.3 40.2 L446.1 40.4 L450.0 42.3 L453.9 39.5 L457.7 41.5 L461.6 40.5 L465.5 39.4 L469.3 39.8 L473.2 39.0 L477.1 41.9 L480.9 43.9 L484.8 38.9 L488.7 39.5 L492.5 40.8 L496.4 38.4 L500.3 40.8 L504.1 39.6 L508.0 40.2 L511.9 39.9 L515.7 39.7 L519.6 40.8 L523.5 42.2 L527.3 42.9 L531.2 41.2 L535.1 39.8 L538.9 40.5 L542.8 41.2 L546.7 38.0 L550.5 40.9 L554.4 39.1 L558.3 38.7 L562.1 41.7 L566.0 40.7 L569.9 40.3 L573.7 39.0 L577.6 42.9 L581.5 38.4 L585.3 40.4 L589.2 40.6 L593.1 39.3 L596.9 44.8 L600.8 44.2 L604.7 41.1 L608.5 40.8 L612.4 40.7 L616.3 41.6 L620.1 40.0 L624.0 40.4" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 2, best dog</title></path>
<path d="M47.9 227.7 L51.7 227.3 L55.6 226.4 L59.5 224.1 L63.3 223.8 L67.2 226.1 L71.1 224.7 L74.9 220.6 L78.8 225.0 L82.7 224.3 L86.5 221.0 L90.4 221.2 L94.3 225.1 L98.1 221.8 L102.0 223.2 L105.9 219.2 L109.7 220.8 L113.6 216.6 L117.5 220.7 L121.3 219.9 L125.2 221.8 L129.1 219.7 L132.9 218.5 L136.8 218.7 L140.7 215.7 L144.5 213.8 L148.4 200.2 L152.3 210.9 L156.1 190.0 L160.0 205.6 L163.9 198.6 L167.7 199.4 L171.6 197.5 L175.5 189.7 L179.3 197.5 L183.2 190.3 L187.1 190.0 L190.9 184.3 L194.8 173.8 L198.7 166.7 L202.5 159.7 L206.4 165.2 L210.3 157.7 L214.1 139.4 L218.0 163.2 L221.9 140.4 L225.7 160.8 L229.6 162.2 L233.5 159.9 L237.3 134.7 L241.2 159.5 L245.1 145.9 L248.9 141.6 L252.8 116.5 L256.7 141.5 L260.5 142.5 L264.4 141.7 L268.3 118.1 L272.1 145.6 L276.0 118.4 L279.9 97.4 L283.7 137.6 L287.6 135.9 L291.5 137.8 L295.3 120.2 L299.2 130.1 L303.1 130.0 L306.9 100.3 L310.8 120.1 L314.7 105.5 L318.5 132.9 L322.4 102.7 L326.3 104.4 L330.1 107.4 L334.0 110.6 L337.9 80.0 L341.7 96.7 L345.6 101.1 L349.5 102.5 L353.3 103.4 L357.2 114.0 L361.1 115.6 L364.9 85.6 L368.8 101.8 L372.7 89.6 L376.5 89.6 L380.4 139.1 L384.3 106.5 L388.1 116.0 L392.0 106.0 L395.9 96.9 L399.7 117.7 L403.6 74.0 L407.5 115.7 L411.3 96.2 L415.2 101.0 L419.1 85.9 L422.9 90.0 L426.8 79.2 L430.7 63.1 L434.5 74.1 L438.4 103.7 L442.3 57.7 L446.1 64.1 L450.0 74.9 L453.9 74.0 L457.7 84.9 L461.6 72.1 L465.5 95.1 L469.3 78.0 L473.2 68.7 L477.1 78.5 L480.9 106.4 L484.8 83.6 L488.7 68.3 L492.5 110.6 L496.4 73.8 L500.3 84.3 L504.1 64.0 L508.0 91.6 L511.9 87.3 L515.7 74.5 L519.6 83.5 L523.5 79.9 L527.3 65.9 L531.2 64.5 L535.1 69.5 L538.9 75.8 L542.8 80.6 L546.7 68.2 L550.5 85.7 L554.4 64.8 L558.3 76.1 L562.1 77.2 L566.0 96.3 L569.9 90.4 L573.7 92.1 L577.6 129.6 L581.5 59.4 L585.3 67.1 L589.2 79.4 L593.1 65.3 L596.9 96.2 L600.8 90.9 L604.7 57.0 L608.5 56.2 L612.4 58.2 L616.3 56.9 L620.1 73.7 L624.0 55.3" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 2, batch average</title></path>
<path d="M47.9 222.7 L51.7 57.2 L55.6 167.8 L59.5 221.8 L63.3 222.3 L67.2 161.7 L71.1 220.9 L74.9 209.9 L78.8 209.4 L82.7 203.3 L86.5 145.0 L90.4 173.1 L94.3 200.5 L98.1 196.0 L102.0 218.1 L105.9 214.8 L109.7 215.1 L113.6 200.6 L117.5 216.3 L121.3 209.7 L125.2 193.1 L129.1 217.2 L132.9 214.0 L136.8 194.9 L140.7 188.6 L144.5 219.2 L148.4 199.5 L152.3 194.6 L156.1 167.4 L160.0 200.9 L163.9 156.4 L167.7 195.7 L171.6 201.5 L175.5 174.6 L179.3 161.4 L183.2 199.7 L187.1 206.6 L190.9 183.7 L194.8 169.2 L198.7 175.0 L202.5 162.8 L206.4 134.7 L210.3 174.9 L214.1 142.2 L218.0 171.3 L221.9 69.2 L225.7 119.5 L229.6 161.8 L233.5 89.8 L237.3 130.5 L241.2 144.6 L245.1 136.6 L248.9 114.3 L252.8 108.9 L256.7 136.7 L260.5 55.2 L264.4 112.7 L268.3 93.7 L272.1 108.2 L276.0 74.3 L279.9 125.5 L283.7 63.3 L287.6 111.4 L291.5 113.1 L295.3 125.9 L299.2 59.1 L303.1 53.6 L306.9 79.2 L310.8 56.0 L314.7 101.3 L318.5 65.6 L322.4 53.8 L326.3 78.3 L330.1 51.2 L334.0 43.9 L337.9 45.2 L341.7 58.1 L345.6 52.2 L349.5 47.7 L353.3 44.2 L357.2 40.9 L361.1 43.2 L364.9 41.4 L368.8 44.1 L372.7 42.4 L376.5 42.3 L380.4 43.9 L384.3 45.6 L388.1 44.9 L392.0 45.5 L395.9 41.1 L399.7 43.8 L403.6 38.3 L407.5 45.4 L411.3 44.9 L415.2 43.0 L419.1 46.9 L422.9 41.5 L426.8 42.1 L430.7 37.8 L434.5 42.3 L438.4 44.5 L442.3 42.1 L446.1 42.5 L450.0 42.1 L453.9 41.8 L457.7 45.0 L461.6 42.8 L465.5 42.6 L469.3 41.5 L473.2 40.0 L477.1 44.0 L480.9 42.0 L484.8 38.0 L488.7 40.5 L492.5 40.9 L496.4 39.1 L500.3 41.3 L504.1 39.8 L508.0 41.2 L511.9 41.6 L515.7 41.1 L519.6 40.6 L523.5 41.8 L527.3 42.1 L531.2 41.4 L535.1 39.6 L538.9 40.6 L542.8 40.6 L546.7 39.2 L550.5 42.1 L554.4 38.9 L558.3 38.4 L562.1 41.7 L566.0 40.9 L569.9 41.5 L573.7 39.8 L577.6 44.4 L581.5 39.5 L585.3 40.1 L589.2 41.4 L593.1 40.9 L596.9 45.1 L600.8 43.9 L604.7 42.4 L608.5 41.7 L612.4 42.7 L616.3 42.1 L620.1 39.6 L624.0 40.7" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="0.85" stroke-linejoin="round"><title>run 3, best dog</title></path>
<path d="M47.9 227.8 L51.7 223.8 L55.6 225.3 L59.5 226.6 L63.3 226.3 L67.2 225.2 L71.1 225.6 L74.9 224.9 L78.8 225.6 L82.7 224.5 L86.5 223.0 L90.4 223.5 L94.3 224.9 L98.1 224.5 L102.0 225.0 L105.9 224.4 L109.7 224.2 L113.6 223.3 L117.5 223.5 L121.3 224.7 L125.2 222.9 L129.1 224.8 L132.9 223.7 L136.8 222.9 L140.7 223.8 L144.5 223.5 L148.4 222.1 L152.3 223.6 L156.1 217.9 L160.0 223.7 L163.9 215.7 L167.7 221.9 L171.6 222.5 L175.5 223.4 L179.3 219.4 L183.2 223.7 L187.1 223.6 L190.9 221.3 L194.8 221.2 L198.7 222.6 L202.5 215.1 L206.4 212.1 L210.3 221.5 L214.1 217.8 L218.0 220.9 L221.9 204.1 L225.7 215.4 L229.6 217.4 L233.5 204.6 L237.3 209.6 L241.2 205.8 L245.1 217.5 L248.9 210.1 L252.8 208.5 L256.7 214.9 L260.5 206.1 L264.4 211.8 L268.3 210.4 L272.1 206.1 L276.0 209.9 L279.9 209.4 L283.7 209.7 L287.6 204.1 L291.5 200.9 L295.3 210.9 L299.2 202.4 L303.1 201.6 L306.9 196.9 L310.8 199.5 L314.7 204.7 L318.5 200.1 L322.4 197.8 L326.3 199.9 L330.1 196.2 L334.0 176.6 L337.9 175.1 L341.7 182.9 L345.6 167.3 L349.5 165.4 L353.3 168.1 L357.2 163.7 L361.1 162.0 L364.9 135.0 L368.8 157.0 L372.7 151.6 L376.5 128.2 L380.4 134.2 L384.3 143.2 L388.1 144.8 L392.0 131.3 L395.9 101.2 L399.7 131.8 L403.6 120.5 L407.5 127.9 L411.3 110.7 L415.2 110.4 L419.1 143.2 L422.9 112.1 L426.8 102.3 L430.7 108.4 L434.5 109.9 L438.4 117.0 L442.3 111.9 L446.1 103.3 L450.0 122.6 L453.9 130.1 L457.7 123.8 L461.6 105.0 L465.5 114.7 L469.3 106.1 L473.2 91.4 L477.1 84.2 L480.9 89.7 L484.8 100.2 L488.7 59.1 L492.5 64.7 L496.4 71.7 L500.3 74.8 L504.1 82.8 L508.0 86.4 L511.9 87.4 L515.7 76.7 L519.6 89.9 L523.5 91.3 L527.3 101.3 L531.2 88.0 L535.1 76.9 L538.9 74.9 L542.8 90.3 L546.7 81.5 L550.5 98.7 L554.4 86.2 L558.3 66.8 L562.1 89.1 L566.0 92.9 L569.9 81.2 L573.7 87.4 L577.6 93.7 L581.5 64.0 L585.3 75.6 L589.2 89.6 L593.1 82.9 L596.9 97.9 L600.8 110.5 L604.7 81.7 L608.5 87.2 L612.4 74.0 L616.3 84.8 L620.1 79.9 L624.0 67.6" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"><title>run 3, batch average</title></path>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>best dog (one line per run)</span><span><i style="background:#c97c12"></i>batch average</span></div>
<figcaption>Score of the best dog and of the batch average, by generation, for the three open-field batches. The dashed line is every sheep in with no time to spare.</figcaption>
</figure>

Three batches of forty-eight on the open field. One had a dog that penned a whole flock by generation 2, one by 17, and one not until 114. That's what this kind of evolution is like: once a batch has one dog that gets behind the flock, its descendants take over in a few generations, and until then nothing much happens.

<!-- TABLE:race -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>dog</th><th class="num">penned all</th><th class="num">median</th><th class="num">worst</th><th class="num">behind the flock</th><th class="num">near a sheep</th></tr></thead>
<tbody>
<tr><td>robot collie, open field</td><td class="num">60 / 60</td><td class="num">11.1s</td><td class="num">14.9s</td><td class="num">99%</td><td class="num">2%</td></tr>
<tr><td>robot collie, best</td><td class="num">60 / 60</td><td class="num">10.7s</td><td class="num">16.7s</td><td class="num">100%</td><td class="num">2%</td></tr>
<tr><td>my collie</td><td class="num">60 / 60</td><td class="num">12.5s</td><td class="num">17.6s</td><td class="num">87%</td><td class="num">4%</td></tr>
<tr><td>the paper's dog</td><td class="num">59 / 60</td><td class="num">16.1s</td><td class="num">32.3s</td><td class="num">71%</td><td class="num">14%</td></tr>
</tbody></table></div>
<!-- /TABLE -->

"Behind the flock" is the share of the run spent on the far side of the flock from the pen; "near a sheep" is the share within three sheep-widths of one. The robot collie is fastest on the median and, which surprised me, on the worst case.

<figure class="robot-figure" data-chart="race">
<svg class="robot-svg" viewBox="0 0 640 280" role="img" aria-label="Time to pen all thirty sheep on sixty flocks, each dog's runs sorted fastest to slowest" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Time to pen all thirty sheep on sixty flocks, each dog's runs sorted fastest to slowest</title>
<line x1="44" x2="624" y1="240.0" y2="240.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="240.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="128.0" y2="128.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="128.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">20</text>
<line x1="44" x2="624" y1="16.0" y2="16.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="16.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">40</text>
<text x="44.0" y="258" fill="#8490b5" text-anchor="middle">0</text>
<text x="140.7" y="258" fill="#8490b5" text-anchor="middle">10</text>
<text x="237.3" y="258" fill="#8490b5" text-anchor="middle">20</text>
<text x="334.0" y="258" fill="#8490b5" text-anchor="middle">30</text>
<text x="430.7" y="258" fill="#8490b5" text-anchor="middle">40</text>
<text x="527.3" y="258" fill="#8490b5" text-anchor="middle">50</text>
<text x="624.0" y="258" fill="#8490b5" text-anchor="middle">60</text>
<path d="M44 16 V240 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<text x="624" y="274" fill="#8490b5" text-anchor="end">flocks, sorted by that dog's time</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">seconds</text>
<path d="M53.7 195.4 L63.3 192.5 L73.0 190.5 L82.7 189.5 L92.3 187.6 L102.0 187.3 L111.7 187.3 L121.3 187.1 L131.0 187.1 L140.7 187.0 L150.3 186.9 L160.0 186.8 L169.7 185.6 L179.3 185.6 L189.0 184.9 L198.7 184.7 L208.3 184.7 L218.0 184.6 L227.7 182.9 L237.3 182.1 L247.0 181.5 L256.7 181.1 L266.3 181.0 L276.0 180.7 L285.7 180.5 L295.3 180.3 L305.0 180.2 L314.7 178.8 L324.3 178.0 L334.0 177.7 L343.7 177.6 L353.3 176.7 L363.0 176.5 L372.7 176.4 L382.3 176.3 L392.0 175.9 L401.7 175.8 L411.3 175.6 L421.0 175.1 L430.7 174.8 L440.3 174.8 L450.0 174.7 L459.7 174.6 L469.3 174.2 L479.0 173.8 L488.7 173.6 L498.3 173.6 L508.0 173.5 L517.7 173.2 L527.3 173.1 L537.0 172.7 L546.7 171.1 L556.3 170.8 L566.0 170.4 L575.7 169.9 L585.3 169.3 L595.0 168.9 L604.7 165.9 L614.3 165.4 L624.0 156.7" fill="none" stroke="#a93fe0" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"><title>robot collie</title></path>
<path d="M53.7 194.0 L63.3 193.4 L73.0 191.0 L82.7 190.3 L92.3 188.9 L102.0 188.1 L111.7 186.5 L121.3 186.3 L131.0 185.0 L140.7 182.7 L150.3 181.9 L160.0 181.9 L169.7 181.8 L179.3 181.3 L189.0 180.4 L198.7 180.0 L208.3 179.5 L218.0 179.1 L227.7 178.8 L237.3 178.1 L247.0 177.5 L256.7 177.3 L266.3 177.3 L276.0 176.3 L285.7 174.9 L295.3 174.3 L305.0 173.9 L314.7 173.5 L324.3 171.6 L334.0 170.5 L343.7 169.5 L353.3 169.0 L363.0 169.0 L372.7 167.9 L382.3 167.3 L392.0 167.1 L401.7 166.5 L411.3 166.4 L421.0 166.2 L430.7 164.7 L440.3 164.0 L450.0 163.7 L459.7 161.6 L469.3 161.1 L479.0 159.0 L488.7 158.8 L498.3 158.2 L508.0 158.1 L517.7 158.1 L527.3 158.1 L537.0 158.0 L546.7 157.8 L556.3 155.8 L566.0 153.9 L575.7 153.8 L585.3 152.5 L595.0 144.7 L604.7 143.9 L614.3 143.1 L624.0 141.5" fill="none" stroke="#35a066" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"><title>my collie</title></path>
<path d="M53.7 199.0 L63.3 189.7 L73.0 187.8 L82.7 185.5 L92.3 181.4 L102.0 179.6 L111.7 178.4 L121.3 177.4 L131.0 177.3 L140.7 171.5 L150.3 171.2 L160.0 168.6 L169.7 168.0 L179.3 168.0 L189.0 167.9 L198.7 167.7 L208.3 167.7 L218.0 166.9 L227.7 166.2 L237.3 166.1 L247.0 164.9 L256.7 163.6 L266.3 160.5 L276.0 159.2 L285.7 159.1 L295.3 152.1 L305.0 151.2 L314.7 150.8 L324.3 150.4 L334.0 150.0 L343.7 148.3 L353.3 147.2 L363.0 146.9 L372.7 146.6 L382.3 145.7 L392.0 145.0 L401.7 144.9 L411.3 144.8 L421.0 142.7 L430.7 142.2 L440.3 140.4 L450.0 136.9 L459.7 136.1 L469.3 134.1 L479.0 133.9 L488.7 133.7 L498.3 133.6 L508.0 132.2 L517.7 132.0 L527.3 131.5 L537.0 127.0 L546.7 113.3 L556.3 108.1 L566.0 103.5 L575.7 101.7 L585.3 99.4 L595.0 97.8 L604.7 93.6 L614.3 58.9" fill="none" stroke="#c97c12" stroke-width="2" stroke-opacity="1" stroke-linejoin="round"><title>the paper's dog</title></path>
</svg>
<div class="robot-legend"><span><i style="background:#a93fe0"></i>robot collie (open field)</span><span><i style="background:#35a066"></i>my collie</span><span><i style="background:#c97c12"></i>the paper's dog</span></div>
<figcaption>Time to pen all thirty sheep on the same sixty flocks, each dog's runs sorted from fastest to slowest.</figcaption>
</figure>

Switching off one thing it can see at a time, and re-running it on thirty flocks:

<!-- TABLE:ablation-open -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>switched off</th><th class="num">score</th><th class="num">penned all</th></tr></thead>
<tbody>
<tr><td>nothing (the dog as evolved)</td><td class="num">2.02</td><td class="num">30 / 30</td></tr>
<tr><td>nearest sheep, how far</td><td class="num">0.19</td><td class="num">0 / 30</td></tr>
<tr><td>nearest obstacle</td><td class="num">0.51</td><td class="num">6 / 30</td></tr>
<tr><td>flock centre</td><td class="num">1.75</td><td class="num">27 / 30</td></tr>
<tr><td>nearest sheep speed</td><td class="num">1.93</td><td class="num">29 / 30</td></tr>
<tr><td>flock to pen</td><td class="num">2.00</td><td class="num">30 / 30</td></tr>
<tr><td>furthest sheep</td><td class="num">2.00</td><td class="num">30 / 30</td></tr>
<tr><td>nearest sheep, where</td><td class="num">2.00</td><td class="num">30 / 30</td></tr>
<tr><td>how spread out</td><td class="num">2.01</td><td class="num">30 / 30</td></tr>
<tr><td>flock speed</td><td class="num">2.02</td><td class="num">30 / 30</td></tr>
<tr><td>share still loose</td><td class="num">2.02</td><td class="num">30 / 30</td></tr>
</tbody></table></div>
<!-- /TABLE -->

Switch off where the pen is, the furthest sheep, how spread out the flock is, or how fast anything is moving, and it still pens thirty out of thirty. Switch off how far the nearest sheep is and it's useless. (The obstacle input reads a constant on a field with no obstacles, and the dog uses it as a second bias.) So on the open field this is a one-input dog: keep the nearest sheep at the distance it likes and run. The pen is dead weight, because on this field the pen is always to the right.

<!-- TABLE:away -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>field</th><th class="num">dog</th><th class="num">penned all</th><th class="num">sheep in, average</th><th class="num">median</th></tr></thead>
<tbody>
<tr><td>awkward flock (36)</td><td class="num">robot collie, open field</td><td class="num">45 / 60</td><td class="num">28.1</td><td class="num">14.8s</td></tr>
<tr><td></td><td class="num">robot collie, retrained</td><td class="num">57 / 60</td><td class="num">34.8</td><td class="num">19.1s</td></tr>
<tr><td></td><td class="num">robot collie, best</td><td class="num">59 / 60</td><td class="num">35.5</td><td class="num">15.8s</td></tr>
<tr><td></td><td class="num">my collie</td><td class="num">60 / 60</td><td class="num">36.0</td><td class="num">17.7s</td></tr>
<tr><td>pond, wall and trees (30)</td><td class="num">robot collie, open field</td><td class="num">54 / 60</td><td class="num">27.0</td><td class="num">15.8s</td></tr>
<tr><td></td><td class="num">robot collie, retrained</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">14.9s</td></tr>
<tr><td></td><td class="num">robot collie, best</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">13.3s</td></tr>
<tr><td></td><td class="num">my collie</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">14.1s</td></tr>
<tr><td>the farm (60, everything)</td><td class="num">robot collie, open field</td><td class="num">12 / 60</td><td class="num">20.6</td><td class="num">25.6s</td></tr>
<tr><td></td><td class="num">robot collie, retrained</td><td class="num">39 / 60</td><td class="num">51.0</td><td class="num">30.4s</td></tr>
<tr><td></td><td class="num">robot collie, best</td><td class="num">52 / 60</td><td class="num">55.5</td><td class="num">31.5s</td></tr>
<tr><td></td><td class="num">my collie</td><td class="num">60 / 60</td><td class="num">60.0</td><td class="num">27.9s</td></tr>
</tbody></table></div>
<!-- /TABLE -->

The retrained dog is a different animal: it's useless without the nearest sheep's distance, like the first, but also without the flock centre or the pen, and it drops a fair bit without the two speed inputs. What it still doesn't use is the furthest sheep, which is the paper's collect rule, or the obstacle inputs. It gets round the pond the way the first dog does, by following the sheep round.

<!-- TABLE:thoughts -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>dog, field</th><th class="num">DRIVE</th><th class="num">COLLECT</th><th class="num">neither</th></tr></thead>
<tbody>
<tr><td>the paper's dog, open field</td><td class="num">51%</td><td class="num">48%</td><td class="num">1%</td></tr>
<tr><td>my collie, open field</td><td class="num">50%</td><td class="num">36%</td><td class="num">14%</td></tr>
<tr><td>robot collie (open field), open field</td><td class="num">38%</td><td class="num">30%</td><td class="num">32%</td></tr>
<tr><td>robot collie (open field), awkward flock</td><td class="num">30%</td><td class="num">24%</td><td class="num">45%</td></tr>
<tr><td>robot collie (retrained), obstacle field</td><td class="num">25%</td><td class="num">24%</td><td class="num">51%</td></tr>
<tr><td>robot collie (retrained), awkward flock</td><td class="num">25%</td><td class="num">28%</td><td class="num">47%</td></tr>
<tr><td>robot collie (best), awkward flock</td><td class="num">31%</td><td class="num">29%</td><td class="num">39%</td></tr>
<tr><td>robot collie (best), the farm</td><td class="num">29%</td><td class="num">27%</td><td class="num">43%</td></tr>
</tbody></table></div>
<!-- /TABLE -->

The paper's dog reads as one of its own two rules 99% of the time, which is the check that the reading works. The retrained robot is "neither" about half the time on both its fields. It isn't doing the paper's job in the paper's order; the two rules describe about half of what it does.

### Things I'd want to check

- Three batches per dog is enough to see they don't all get there at the same speed and not enough to say how often one gets stuck.
- The inputs are mine, and the dog can only build rules out of what I gave it.
- The turning limit and taking the ewes out both happened after the dogs were evolved. I re-evolved with the limit in from the start and got the same dogs back; with the ewes in, the retrained dog gets 37 of 60 awkward flocks instead of 57.
- "Reads as DRIVE" is my definition: within about 45 degrees of the spot the paper's dog would run to.

## How to make it the best dog

That was the honest first attempt. Then I gave myself an hour of compute to make the best dog I could without changing what a dog is. Three changes: two more things to see (the sheep left furthest behind, and which way the flock is drifting), all four fields in the training at once, and a start from the retrained dog rather than from scratch, with the new inputs wired to zero so it begins exactly as good as it was.

Here it is thinking next to one of the earlier dogs, on the same flock, same sheep, same field. Change the field and the other dog with the menus.

<div class="sheepdog robot-compare" data-robot-compare="awkward">
  <div class="sheepdog-controls robot-compare-controls">
    <label class="robot-gens">field <select data-role="level"><option value="awkward" selected>awkward flock</option><option value="farm2">the farm</option><option value="field">pond, wall and trees</option><option value="paper">open field</option></select></label>
    <label class="robot-gens">against <select data-role="rival"><option value="open" selected>the open-field dog</option><option value="farm">the retrained dog</option></select></label>
    <button type="button" data-action="new">New flock</button>
    <label><input type="checkbox" data-role="work" checked /> workings</label>
  </div>
  <div class="robot-compare-main">
    <div class="robot-compare-col" data-dog="best">
      <div class="robot-label robot-compare-title"><b data-role="dog-name">the best dog</b></div>
      <canvas class="robot-field" aria-label="The best dog working the flock"></canvas>
      <div class="sheepdog-hud"><span data-role="status">lie down</span></div>
      <div class="sheepdog-hud"><span data-role="tally"></span></div>
      <div class="robot-label">what it sees</div>
      <div class="robot-bars" data-role="inputs"></div>
      <div class="robot-label">the ten neurons</div>
      <div class="robot-bars" data-role="hidden"></div>
      <div class="robot-label">what it decided</div>
      <div class="robot-out" data-role="outputs"></div>
    </div>
    <div class="robot-compare-col" data-dog="rival">
      <div class="robot-label robot-compare-title"><b data-role="dog-name">the open-field dog</b></div>
      <canvas class="robot-field" aria-label="The other dog working the same flock"></canvas>
      <div class="sheepdog-hud"><span data-role="status">lie down</span></div>
      <div class="sheepdog-hud"><span data-role="tally"></span></div>
      <div class="robot-label">what it sees</div>
      <div class="robot-bars" data-role="inputs"></div>
      <div class="robot-label">the ten neurons</div>
      <div class="robot-bars" data-role="hidden"></div>
      <div class="robot-label">what it decided</div>
      <div class="robot-out" data-role="outputs"></div>
    </div>
  </div>
</div>

<!-- TABLE:best -->
<div class="robot-table-wrap"><table class="robot-table">
<thead><tr><th>field</th><th class="num">best dog penned all</th><th class="num">sheep in, average</th><th class="num">best dog median</th><th class="num">my collie penned all</th><th class="num">my collie median</th></tr></thead>
<tbody>
<tr><td>open field (30)</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">10.7s</td><td class="num">60 / 60</td><td class="num">12.5s</td></tr>
<tr><td>awkward flock (36)</td><td class="num">59 / 60</td><td class="num">35.5</td><td class="num">15.8s</td><td class="num">60 / 60</td><td class="num">17.7s</td></tr>
<tr><td>pond, wall and trees (30)</td><td class="num">60 / 60</td><td class="num">30.0</td><td class="num">13.3s</td><td class="num">60 / 60</td><td class="num">14.1s</td></tr>
<tr><td>the farm (60)</td><td class="num">52 / 60</td><td class="num">55.5</td><td class="num">31.5s</td><td class="num">60 / 60</td><td class="num">27.9s</td></tr>
</tbody></table></div>
<!-- /TABLE -->

Better than my collie on three fields out of four, and behind it only on the farm. And the thing I didn't expect: it ignores both of the new inputs. Switch off the sheep-left-behind and it does fractionally *better*. Everything it gained came from training on all four fields and starting from a dog that worked. It's also the first dog with no single point of failure: every earlier dog collapsed if you took away the nearest sheep's distance, and this one only dips whatever you take away.

## What I took from it

I expected the paper's two rules and got a different dog each time. On the open field, evolution found something simpler than the paper: a one-input dog, faster than the hand-written one, useless anywhere else. On the harder fields it found something that looks at four or five things and still only half overlaps with the paper's rules. On all four fields it found a dog that's better than mine on three of them and doesn't lean on any one thing it can see. The lesson is the same one three times: it learns the fields it's given, and the way to get a general dog is to give it general fields, not cleverer eyes.

The other thing is that I can read the paper's dog, and I can only measure this one. I know what the robot collie does because I switched its inputs off one at a time and watched what broke, and because I wrote something that guesses what it's doing in the paper's words. It works better than mine and I understand it less, and I suspect that's the usual trade from here on.

<script src="/sim/sheepdog.js" data-astro-rerun></script>
<script src="/sim/robot-collie.js" data-astro-rerun></script>
<style>
  .sheepdog { margin: 1.5rem 0; }
  .demo-box { margin: 1.5rem 0; border: 1px solid var(--gray-800); border-radius: 1rem; background: var(--gray-999_40); }
  .demo-box > summary { list-style: none; cursor: pointer; padding: 0.9rem 1.1rem; display: flex; gap: 0.75rem 1rem; align-items: baseline; flex-wrap: wrap; }
  .demo-box > summary::-webkit-details-marker { display: none; }
  .demo-box > summary::before { content: "▸"; color: var(--accent-dark); font-size: 0.9em; }
  .demo-box[open] > summary::before { content: "▾"; }
  .demo-box .demo-title { font-family: var(--font-brand); font-weight: 600; color: var(--gray-0); }
  .demo-box .demo-desc { color: var(--gray-300); font-size: var(--text-sm); flex: 1 1 16rem; }
  .demo-box .demo-open { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--accent-dark); }
  .demo-box[open] .demo-open { display: none; }
  .demo-box > .sheepdog { margin: 0; padding: 0 1.1rem 1.1rem; }
  .sheepdog canvas {
    display: block; width: 100%; touch-action: none; cursor: crosshair;
    border-radius: 1rem; border: 1px solid var(--gray-800); background: #0e1711;
  }
  .sheepdog canvas.robot-field { cursor: default; }
  .sheepdog canvas.robot-chart { cursor: default; margin-top: 0.75rem; height: 120px; border-radius: 0.75rem; }
  .robot-hud-fixed { height: 1.5em; min-height: 1.5em; overflow: hidden; flex-wrap: nowrap; }
  .robot-hud-fixed > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .robot-hud-fixed .sheepdog-stats { flex: 0 0 auto; }
  .sheepdog-hud {
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-stats { color: var(--gray-400); white-space: nowrap; }
  .sheepdog-controls {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.6rem; font-size: var(--text-sm);
  }
  .sheepdog-controls button, .sheepdog-controls select {
    font: inherit; padding: 0.35rem 0.8rem; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200);
  }
  .sheepdog-controls button[aria-pressed="true"] { border-color: var(--accent-dark); color: var(--accent-dark); }
  .sheepdog-controls button:hover { border-color: var(--gray-500); }
  .sheepdog-controls label { margin-left: auto; color: var(--gray-400); display: flex; gap: 0.35rem; align-items: center; cursor: pointer; }
  .sheepdog-controls label.robot-gens { margin-left: 0; }
  .sheepdog-board {
    display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: baseline; margin-top: 0.6rem;
    font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .sheepdog-board b { color: var(--gray-0); font-weight: 600; }
  .sheepdog-verdict { color: var(--accent-dark); }
  .sheepdog-traits { margin-top: 0.4rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-400); }
  .robot-compare-main { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .robot-compare-col { flex: 1 1 300px; min-width: 0; font-family: var(--font-mono); font-size: var(--text-sm); }
  .robot-compare-col canvas.robot-field { width: 100%; }
  .robot-compare-title { margin: 0 0 0.4rem; color: var(--gray-0); }
  .robot-compare-controls { margin-top: 0; margin-bottom: 0.8rem; }
  .robot-compare .robot-bar { grid-template-columns: 6.8em 1fr 2.8em; font-size: 0.7rem; }
  .robot-compare .robot-bar span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .robot-thoughts-main { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .robot-thoughts-field { flex: 1 1 380px; min-width: 0; }
  .robot-thoughts-panel { flex: 0 1 260px; min-width: 220px; font-family: var(--font-mono); font-size: var(--text-sm); }
  .robot-label { color: var(--gray-300); margin: 0.4rem 0 0.2rem; }
  .robot-bars { display: flex; flex-direction: column; gap: 2px; }
  .robot-bar { display: grid; grid-template-columns: 6.5em 1fr 3.5em; gap: 0.4rem; align-items: center; color: var(--gray-400); font-size: 0.75rem; }
  .robot-bar i { position: relative; display: block; height: 8px; background: var(--gray-900); border-radius: 3px; overflow: hidden; }
  .robot-bar i b { position: absolute; top: 0; height: 100%; }
  .robot-bar em { font-style: normal; text-align: right; color: var(--gray-500); }
  .robot-out { color: var(--gray-200); display: flex; gap: 0.5rem; align-items: center; margin-top: 0.2rem; }
  .robot-arrow { display: inline-block; font-size: 1.4em; color: var(--accent-dark); transition: transform 0.1s linear; }
  .robot-legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .robot-legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
  .robot-legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; }
  .robot-svg { display: block; width: 100%; height: auto; margin-top: 1rem; }
  .robot-figure { margin: 1.5rem 0; }
  .robot-figure figcaption { font-size: var(--text-sm); color: var(--gray-400); margin-top: 0.5rem; }
  .robot-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); margin: 1rem 0; }
  .robot-table th, .robot-table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--gray-800); }
  .robot-table th { color: var(--gray-300); font-weight: 500; font-family: var(--font-mono); }
  .robot-table td.num, .robot-table th.num { text-align: right; font-family: var(--font-mono); }
  .robot-table-wrap { overflow-x: auto; }
</style>

---

*The sheep, the fields and the hand-written collie are from [the last post](/blog/the-collie-is-the-algorithm/), which has the sources. The robot collie is a plain neural network evolved with a genetic algorithm (tournament selection, uniform crossover, Gaussian mutation, two elites), the sort of thing in Floreano D. & Mattiussi C. (2008), Bio-Inspired Artificial Intelligence, MIT Press. [Robot collie code](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/robot-collie.js) · [experiment script](https://github.com/samllbrown/samuellbrown.dev/blob/main/scripts/robot-collie-experiments.mjs).*
