---
title: A memory that rolls downhill
publishDate: 2026-08-27 00:00:00
description: |
  I wanted a learning rule that fits on a postcard, so I built a Hopfield network: 400 neurons that learn a picture by looking at it once, and remember it by falling down an energy landscape. It works, it breaks on the third picture, and fixing that leads straight to the attention mechanism in a transformer. Three demos you can draw on, then the numbers.
draft: true
tags:
  - AI
  - Machine Learning
  - Simulation
---

The thing I took away from [the sheepdog post](/blog/the-collie-is-the-algorithm/) was that the two rules doing all the work fitted on a postcard. This time I wanted the *learning* to fit on a postcard as well, and I didn't want to do the usual thing, which is a pile of weights, a loss function and gradient descent. That works, everybody knows it works, and it doesn't tell you much about what remembering actually is.

So I built the odd one. In 1982 a physicist called John Hopfield wrote down a network of neurons that behaves like a lump of magnetic material. It learns a picture by looking at it once, with a rule from 1949 that says neurons that fire together wire together, and it remembers by rolling downhill. It has no loss function and no training loop. It's also famously bad at its job, and everyone has known exactly how bad since 1985. Hopfield got half of the 2024 Nobel Prize in Physics for it, which is a strange thing to be able to say about a model that can't hold three of my pictures. I wanted to see that for myself, so I built it, drew some pictures for it to remember, and kept going until it broke, then followed the fixes to see where they led. They led somewhere I didn't expect.

## The model

There are 400 neurons in a 20 by 20 grid. Each one is either on (+1) or off (−1), and every neuron is wired to every other one with a weight that can be positive or negative. That's the whole network: a picture, and a 400 by 400 table of numbers.

Storing a picture is one line. For every pair of neurons, if they're both on or both off in the picture, nudge the weight between them up. If one is on and one is off, nudge it down.

```js title="hebb.js"
// Store a picture x (an array of ±1). This is the whole learning rule.
for (let i = 0; i < n; i++)
  for (let j = 0; j < n; j++)
    if (i !== j) W[i][j] += x[i] * x[j] / n;
```

Recalling is also one line. Pick a neuron at random, add up what its neighbours are telling it (each neighbour's state times the weight between them), and go with the majority. Keep doing that until nothing changes.

```js title="recall.js"
// Update one neuron. Repeat, in random order, until nobody flips.
const h = W[i].reduce((sum, w, j) => sum + w * x[j], 0);
x[i] = h > 0 ? 1 : h < 0 ? -1 : x[i];
```

The reason it works is the bit that came from physics. You can write down a number for any state of the network, its **energy**, and it turns out that a neuron going with the majority can only ever lower that number, never raise it. So the network has to stop somewhere. The learning rule digs a valley in the energy landscape at every picture you store, and recall is just the network rolling down into whichever valley it starts nearest. A scribbled-on sheep is halfway up the side of the sheep valley, and it rolls to the bottom.

## Storing pictures

This one starts with a sheep and a dog already stored, and a scribbled-on sheep on the grid. Press **Recall** and watch the energy on the right fall. The purple flashes are neurons changing their mind. The stripy square is the whole memory, all 160,000 weights, with orange for "these two agree" and purple for "these two disagree".

Then try **Rub out half**, and Recall again. Then draw your own picture on the grid (click and drag) and **Remember this**. And then, because this is the interesting bit, click the heart in the library, Remember that too, load the sheep from the memories row, scribble on it and Recall.

<div class="hop" data-hopfield="memory" data-preload="sheep,dog">
  <div class="hop-main">
    <canvas class="hop-grid" data-role="grid" aria-label="A 20 by 20 grid of neurons you can draw on"></canvas>
    <div class="hop-side">
      <div class="hop-label">Library <span>click to load</span></div>
      <div class="hop-thumbs" data-role="library"></div>
      <div class="hop-label">Memories <span data-role="count">0 stored</span></div>
      <div class="hop-thumbs" data-role="memories"></div>
      <div class="hop-row">
        <canvas class="hop-weights" data-role="weights" aria-label="The 400 by 400 weight matrix"></canvas>
        <canvas class="hop-chart" data-role="chart" aria-label="Energy during recall"></canvas>
      </div>
    </div>
  </div>
  <div class="hop-hud">
    <span data-role="status">lie down</span>
    <span class="hop-stats" data-role="energy">E = 0</span>
  </div>
  <div class="hop-controls">
    <button type="button" data-action="recall">Recall</button>
    <button type="button" data-action="scribble">Scribble on it</button>
    <button type="button" data-action="erase">Rub out half</button>
    <button type="button" data-action="remember">Remember this</button>
    <button type="button" data-action="clear">Blank</button>
    <button type="button" data-action="forget">Forget everything</button>
  </div>
</div>

The sheep doesn't come back. You get something that's mostly sheep with the heart bleeding into it, and it's the same the other way round. Try the house instead of the heart and all three work. Four pictures never works whatever you pick. That's not a bug. It's a 400-neuron network with a 400 by 400 memory, and which pictures it can hold together depends on how alike they are. Understanding why took most of the time I spent on this.

Every picture you store is added on top of the last one in the same table. When the network tries to recall the sheep, the weights from the sheep pull each neuron the right way, and the weights from the dog and the heart pull it in some other direction. Those other pulls are noise, and they add up. With random pictures, where every pixel is a coin flip, the noise stays small until you've stored about 14% as many pictures as you have neurons, which is 55 here. My pictures are nothing like random: they're mostly dark background with a light blob in the middle, so the sheep and the heart agree on about four fifths of their pixels before you've stored anything. The "noise" from the heart isn't noise at all, it's pulling in a definite direction, and it only takes a third picture to tip it over.

## Overfilling it

To see the 14% cliff properly you need random pictures, which just look like static. This one keeps adding random pictures five at a time, and after each batch it scribbles on a sample of the stored ones and checks whether they come back exactly. The dashed line is where the theory says it should fall over. **Run to 120** does the lot.

Once you've watched the Hebb rule fall off its cliff, switch the rule and run again. The other two curves stay on the chart so you can compare.

<div class="hop" data-hopfield="capacity">
  <div class="hop-main">
    <canvas class="hop-chart-big" data-role="chart" aria-label="Fraction of stored patterns recalled against the number stored"></canvas>
    <div class="hop-side hop-side-narrow">
      <div class="hop-label">Sample <span>stored → recalled</span></div>
      <div class="hop-pairs" data-role="pairs"></div>
    </div>
  </div>
  <div class="hop-hud">
    <span data-role="status">empty network</span>
    <span class="hop-stats" data-role="score">0 stored</span>
  </div>
  <div class="hop-controls">
    <label>Rule <select data-role="rule"><option value="hebb">Hebb (1949)</option><option value="storkey">Storkey (1997)</option><option value="pinv">Pseudo-inverse (1985)</option></select></label>
    <button type="button" data-action="add">Add 5</button>
    <button type="button" data-action="run">Run to 120</button>
    <button type="button" data-action="reset">Reset</button>
    <button type="button" data-action="clear">Clear chart</button>
    <label><input type="checkbox" data-role="pictures" /> start with the six pictures</label>
  </div>
  <div class="hop-legend" data-role="legend"></div>
</div>

The **Storkey** rule is Hebb's rule with a correction. Before it stores a new picture it checks what the network already thinks about each pixel, and only stores the part of the new picture that the network doesn't already know. It still only needs things a neuron could plausibly know, its own state and its own input, and here it roughly triples the capacity.

The **pseudo-inverse** is the cheat. It takes every picture stored so far, inverts a matrix, and sets the weights directly so that every one of them is a valley. In theory it can store as many pictures as it has neurons, and in practice, if you want a scribbled copy to come back, about half that. But it isn't learning in any sense a neuron could do: every time you add a picture it needs all the old ones back to recompute the whole table. It's the difference between a rule of thumb and looking the answer up.

If you tick **start with the six pictures**, the sample panel always shows those six first, and you can see the Hebb rule losing them almost immediately while the other two rules hold on.

## The version that's secretly a transformer

The obvious question is whether you can dig the valleys steeper so they don't blur into each other. In 2016 Krotov and Hopfield did that, and in 2020 a group in Linz took it to its limit and noticed something. If you make the energy exponential in how well the state matches each stored picture, the capacity stops being 14% of the neurons and becomes exponential in the number of neurons. And the recall update for that network is

```js title="dense-recall.js"
// Ξ is the list of stored pictures, x is the state, β is a sharpness.
x = Ξᵀ · softmax(β · Ξ · x)
```

which is one step of the attention mechanism in a transformer. The state is the query, the stored pictures are the keys and the values, and β is the scaling factor. That's the result that made me want to build this: the memory model from the 1982 paper, pushed to its limit, is the block that large language models are made of.

This demo has all six pictures stored plus, if you tick the box, 200 random ones, which the Hebb rule couldn't get near. The panel on the right shows where the attention is going, so you can watch it decide. The slider is β. Turn it right down and Recall: you get a blend of all the memories, because the softmax is spread across all of them. Turn it up and it snaps to one.

<div class="hop" data-hopfield="dense">
  <div class="hop-main">
    <canvas class="hop-grid" data-role="grid" aria-label="A 20 by 20 grid of neurons you can draw on, dense Hopfield version"></canvas>
    <div class="hop-side">
      <div class="hop-label">Library <span data-role="count">6 stored</span></div>
      <div class="hop-thumbs" data-role="library"></div>
      <div class="hop-label">Attention <span>which memories it's reading</span></div>
      <div class="hop-attention" data-role="attention"></div>
    </div>
  </div>
  <div class="hop-hud">
    <span data-role="status">lie down</span>
    <span class="hop-stats" data-role="beta-out">β</span>
  </div>
  <div class="hop-controls">
    <button type="button" data-action="recall">Recall</button>
    <button type="button" data-action="scribble">Scribble on it</button>
    <button type="button" data-action="erase">Rub out half</button>
    <button type="button" data-action="clear">Blank</button>
    <label class="hop-slider">β <input type="range" data-role="beta" min="-3" max="-0.7" step="0.05" value="-1.3" /></label>
    <label><input type="checkbox" data-role="noise" /> also store 200 random pictures</label>
  </div>
</div>

Something has been given up here, and it's worth being clear about what. The original network learned: it squashed every picture it had seen into one table of weights, and a neuron only needed its neighbours to update. This one doesn't learn anything. The stored pictures *are* the weights, kept as they were, and recall is a soft lookup against all of them. It remembers more because it's stopped trying to compress. Whether you think attention is a memory or a memory is attention comes down to which paper you read first.

## The numbers

Everything below was measured with the same code that runs the demos, on a 400-neuron network, and each point is the average of three seeded runs. "Recalled" means the network was given a copy of a stored pattern with 10% of the pixels flipped and came back with the original exactly, every pixel. The script is in the repo if you want to rerun it.

### Where the cliff is

The theory (Amit, Gutfreund and Sompolinsky, 1985) says the Hebb rule stores at most 0.138 patterns per neuron, which is 55 for this network. That number comes from spin-glass physics and it's for random patterns, in the limit of an infinitely large network, and it allows the recalled pattern to have a couple of percent of its pixels wrong. I measured something stricter, so I expected to land a bit short of it.

<figure class="hop-figure">
<svg class="hop-svg" viewBox="0 0 640 300" role="img" aria-label="Fraction of stored random patterns recalled exactly from a 10% corruption, by learning rule, n = 400" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Fraction of stored random patterns recalled exactly from a 10% corruption, by learning rule, n = 400</title>
<line x1="44" x2="624" y1="260.0" y2="260.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="260.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="140.4" y2="140.4" stroke="rgba(255,255,255,0.14)"/><text x="36" y="140.4" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0.5</text>
<line x1="44" x2="624" y1="20.8" y2="20.8" stroke="rgba(255,255,255,0.14)"/><text x="36" y="20.8" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<text x="44.0" y="278" fill="#8490b5" text-anchor="middle">0</text>
<text x="143.7" y="278" fill="#8490b5" text-anchor="middle">55</text>
<text x="225.3" y="278" fill="#8490b5" text-anchor="middle">100</text>
<text x="315.9" y="278" fill="#8490b5" text-anchor="middle">150</text>
<text x="406.5" y="278" fill="#8490b5" text-anchor="middle">200</text>
<text x="497.1" y="278" fill="#8490b5" text-anchor="middle">250</text>
<text x="587.8" y="278" fill="#8490b5" text-anchor="middle">300</text>
<path d="M44 16 V260 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="143.7" x2="143.7" y1="16" y2="260" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/><text x="149.7" y="89.2" fill="#c3cadb">0.138n</text>
<text x="624" y="294" fill="#8490b5" text-anchor="end">random patterns stored (n = 400 neurons)</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">recalled</text>
<path d="M53.1 20.8 L62.1 20.8 L71.2 20.8 L80.3 24.8 L89.3 27.2 L98.4 34.1 L107.4 52.7 L116.5 80.6 L125.6 130.4 L134.6 166.3 L143.7 200.2 L152.8 208.2 L161.8 242.1 L170.9 258.0 L179.9 256.0 L189.0 258.0 L198.1 260.0 L207.1 260.0 L216.2 260.0 L225.3 260.0 L234.3 260.0 L243.4 260.0 L252.4 260.0 L261.5 260.0" fill="none" stroke="#a93fe0" stroke-width="2" stroke-linejoin="round"><title>Hebb</title></path>
<circle cx="53.1" cy="20.8" r="6" fill="transparent"><title>Hebb: 5 stored, 100% recalled</title></circle>
<circle cx="62.1" cy="20.8" r="6" fill="transparent"><title>Hebb: 10 stored, 100% recalled</title></circle>
<circle cx="71.2" cy="20.8" r="6" fill="transparent"><title>Hebb: 15 stored, 100% recalled</title></circle>
<circle cx="80.3" cy="24.8" r="6" fill="transparent"><title>Hebb: 20 stored, 98% recalled</title></circle>
<circle cx="89.3" cy="27.2" r="6" fill="transparent"><title>Hebb: 25 stored, 97% recalled</title></circle>
<circle cx="98.4" cy="34.1" r="6" fill="transparent"><title>Hebb: 30 stored, 94% recalled</title></circle>
<circle cx="107.4" cy="52.7" r="6" fill="transparent"><title>Hebb: 35 stored, 87% recalled</title></circle>
<circle cx="116.5" cy="80.6" r="6" fill="transparent"><title>Hebb: 40 stored, 75% recalled</title></circle>
<circle cx="125.6" cy="130.4" r="6" fill="transparent"><title>Hebb: 45 stored, 54% recalled</title></circle>
<circle cx="134.6" cy="166.3" r="6" fill="transparent"><title>Hebb: 50 stored, 39% recalled</title></circle>
<circle cx="143.7" cy="200.2" r="6" fill="transparent"><title>Hebb: 55 stored, 25% recalled</title></circle>
<circle cx="152.8" cy="208.2" r="6" fill="transparent"><title>Hebb: 60 stored, 22% recalled</title></circle>
<circle cx="161.8" cy="242.1" r="6" fill="transparent"><title>Hebb: 65 stored, 8% recalled</title></circle>
<circle cx="170.9" cy="258.0" r="6" fill="transparent"><title>Hebb: 70 stored, 1% recalled</title></circle>
<circle cx="179.9" cy="256.0" r="6" fill="transparent"><title>Hebb: 75 stored, 2% recalled</title></circle>
<circle cx="189.0" cy="258.0" r="6" fill="transparent"><title>Hebb: 80 stored, 1% recalled</title></circle>
<circle cx="198.1" cy="260.0" r="6" fill="transparent"><title>Hebb: 85 stored, 0% recalled</title></circle>
<circle cx="207.1" cy="260.0" r="6" fill="transparent"><title>Hebb: 90 stored, 0% recalled</title></circle>
<circle cx="216.2" cy="260.0" r="6" fill="transparent"><title>Hebb: 95 stored, 0% recalled</title></circle>
<circle cx="225.3" cy="260.0" r="6" fill="transparent"><title>Hebb: 100 stored, 0% recalled</title></circle>
<circle cx="234.3" cy="260.0" r="6" fill="transparent"><title>Hebb: 105 stored, 0% recalled</title></circle>
<circle cx="243.4" cy="260.0" r="6" fill="transparent"><title>Hebb: 110 stored, 0% recalled</title></circle>
<circle cx="252.4" cy="260.0" r="6" fill="transparent"><title>Hebb: 115 stored, 0% recalled</title></circle>
<circle cx="261.5" cy="260.0" r="6" fill="transparent"><title>Hebb: 120 stored, 0% recalled</title></circle>
<path d="M53.1 20.8 L62.1 20.8 L71.2 20.8 L80.3 20.8 L89.3 20.8 L98.4 20.8 L107.4 20.8 L116.5 20.8 L125.6 20.8 L134.6 20.8 L143.7 20.8 L152.8 20.8 L161.8 20.8 L170.9 20.8 L179.9 20.8 L189.0 20.8 L198.1 20.8 L207.1 20.8 L216.2 20.8 L225.3 20.8 L234.3 20.8 L243.4 20.8 L252.4 20.8 L261.5 22.8 L270.6 26.8 L279.6 34.7 L288.7 34.7 L297.8 52.7 L306.8 76.6 L315.9 88.6 L324.9 124.4 L334.0 142.4 L343.1 146.4 L352.1 180.3 L361.2 196.2 L370.3 200.2 L379.3 214.2 L388.4 230.1 L397.4 248.0 L406.5 228.1" fill="none" stroke="#c97c12" stroke-width="2" stroke-linejoin="round"><title>Storkey</title></path>
<circle cx="53.1" cy="20.8" r="6" fill="transparent"><title>Storkey: 5 stored, 100% recalled</title></circle>
<circle cx="62.1" cy="20.8" r="6" fill="transparent"><title>Storkey: 10 stored, 100% recalled</title></circle>
<circle cx="71.2" cy="20.8" r="6" fill="transparent"><title>Storkey: 15 stored, 100% recalled</title></circle>
<circle cx="80.3" cy="20.8" r="6" fill="transparent"><title>Storkey: 20 stored, 100% recalled</title></circle>
<circle cx="89.3" cy="20.8" r="6" fill="transparent"><title>Storkey: 25 stored, 100% recalled</title></circle>
<circle cx="98.4" cy="20.8" r="6" fill="transparent"><title>Storkey: 30 stored, 100% recalled</title></circle>
<circle cx="107.4" cy="20.8" r="6" fill="transparent"><title>Storkey: 35 stored, 100% recalled</title></circle>
<circle cx="116.5" cy="20.8" r="6" fill="transparent"><title>Storkey: 40 stored, 100% recalled</title></circle>
<circle cx="125.6" cy="20.8" r="6" fill="transparent"><title>Storkey: 45 stored, 100% recalled</title></circle>
<circle cx="134.6" cy="20.8" r="6" fill="transparent"><title>Storkey: 50 stored, 100% recalled</title></circle>
<circle cx="143.7" cy="20.8" r="6" fill="transparent"><title>Storkey: 55 stored, 100% recalled</title></circle>
<circle cx="152.8" cy="20.8" r="6" fill="transparent"><title>Storkey: 60 stored, 100% recalled</title></circle>
<circle cx="161.8" cy="20.8" r="6" fill="transparent"><title>Storkey: 65 stored, 100% recalled</title></circle>
<circle cx="170.9" cy="20.8" r="6" fill="transparent"><title>Storkey: 70 stored, 100% recalled</title></circle>
<circle cx="179.9" cy="20.8" r="6" fill="transparent"><title>Storkey: 75 stored, 100% recalled</title></circle>
<circle cx="189.0" cy="20.8" r="6" fill="transparent"><title>Storkey: 80 stored, 100% recalled</title></circle>
<circle cx="198.1" cy="20.8" r="6" fill="transparent"><title>Storkey: 85 stored, 100% recalled</title></circle>
<circle cx="207.1" cy="20.8" r="6" fill="transparent"><title>Storkey: 90 stored, 100% recalled</title></circle>
<circle cx="216.2" cy="20.8" r="6" fill="transparent"><title>Storkey: 95 stored, 100% recalled</title></circle>
<circle cx="225.3" cy="20.8" r="6" fill="transparent"><title>Storkey: 100 stored, 100% recalled</title></circle>
<circle cx="234.3" cy="20.8" r="6" fill="transparent"><title>Storkey: 105 stored, 100% recalled</title></circle>
<circle cx="243.4" cy="20.8" r="6" fill="transparent"><title>Storkey: 110 stored, 100% recalled</title></circle>
<circle cx="252.4" cy="20.8" r="6" fill="transparent"><title>Storkey: 115 stored, 100% recalled</title></circle>
<circle cx="261.5" cy="22.8" r="6" fill="transparent"><title>Storkey: 120 stored, 99% recalled</title></circle>
<circle cx="270.6" cy="26.8" r="6" fill="transparent"><title>Storkey: 125 stored, 98% recalled</title></circle>
<circle cx="279.6" cy="34.7" r="6" fill="transparent"><title>Storkey: 130 stored, 94% recalled</title></circle>
<circle cx="288.7" cy="34.7" r="6" fill="transparent"><title>Storkey: 135 stored, 94% recalled</title></circle>
<circle cx="297.8" cy="52.7" r="6" fill="transparent"><title>Storkey: 140 stored, 87% recalled</title></circle>
<circle cx="306.8" cy="76.6" r="6" fill="transparent"><title>Storkey: 145 stored, 77% recalled</title></circle>
<circle cx="315.9" cy="88.6" r="6" fill="transparent"><title>Storkey: 150 stored, 72% recalled</title></circle>
<circle cx="324.9" cy="124.4" r="6" fill="transparent"><title>Storkey: 155 stored, 57% recalled</title></circle>
<circle cx="334.0" cy="142.4" r="6" fill="transparent"><title>Storkey: 160 stored, 49% recalled</title></circle>
<circle cx="343.1" cy="146.4" r="6" fill="transparent"><title>Storkey: 165 stored, 48% recalled</title></circle>
<circle cx="352.1" cy="180.3" r="6" fill="transparent"><title>Storkey: 170 stored, 33% recalled</title></circle>
<circle cx="361.2" cy="196.2" r="6" fill="transparent"><title>Storkey: 175 stored, 27% recalled</title></circle>
<circle cx="370.3" cy="200.2" r="6" fill="transparent"><title>Storkey: 180 stored, 25% recalled</title></circle>
<circle cx="379.3" cy="214.2" r="6" fill="transparent"><title>Storkey: 185 stored, 19% recalled</title></circle>
<circle cx="388.4" cy="230.1" r="6" fill="transparent"><title>Storkey: 190 stored, 13% recalled</title></circle>
<circle cx="397.4" cy="248.0" r="6" fill="transparent"><title>Storkey: 195 stored, 5% recalled</title></circle>
<circle cx="406.5" cy="228.1" r="6" fill="transparent"><title>Storkey: 200 stored, 13% recalled</title></circle>
<path d="M53.1 20.8 L62.1 20.8 L71.2 20.8 L80.3 20.8 L89.3 20.8 L98.4 20.8 L107.4 20.8 L116.5 20.8 L125.6 20.8 L134.6 20.8 L143.7 20.8 L152.8 20.8 L161.8 20.8 L170.9 20.8 L179.9 20.8 L189.0 20.8 L198.1 20.8 L207.1 20.8 L216.2 20.8 L225.3 20.8 L234.3 20.8 L243.4 20.8 L252.4 20.8 L261.5 20.8 L270.6 20.8 L279.6 20.8 L288.7 20.8 L297.8 20.8 L306.8 20.8 L315.9 20.8 L324.9 20.8 L334.0 20.8 L343.1 20.8 L352.1 20.8 L361.2 24.8 L370.3 36.7 L379.3 28.8 L388.4 58.7 L397.4 80.6 L406.5 98.5 L415.6 138.4 L424.6 168.3 L433.7 186.2 L442.8 230.1 L451.8 238.1 L460.9 246.0 L469.9 258.0 L479.0 260.0 L488.1 260.0 L497.1 258.0 L506.2 260.0 L515.3 260.0 L524.3 260.0 L533.4 260.0 L542.4 260.0 L551.5 260.0 L560.6 260.0 L569.6 260.0 L578.7 260.0 L587.8 260.0 L596.8 260.0 L605.9 260.0 L614.9 260.0 L624.0 260.0" fill="none" stroke="#35a066" stroke-width="2" stroke-linejoin="round"><title>Pseudo-inverse</title></path>
<circle cx="53.1" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 5 stored, 100% recalled</title></circle>
<circle cx="62.1" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 10 stored, 100% recalled</title></circle>
<circle cx="71.2" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 15 stored, 100% recalled</title></circle>
<circle cx="80.3" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 20 stored, 100% recalled</title></circle>
<circle cx="89.3" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 25 stored, 100% recalled</title></circle>
<circle cx="98.4" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 30 stored, 100% recalled</title></circle>
<circle cx="107.4" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 35 stored, 100% recalled</title></circle>
<circle cx="116.5" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 40 stored, 100% recalled</title></circle>
<circle cx="125.6" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 45 stored, 100% recalled</title></circle>
<circle cx="134.6" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 50 stored, 100% recalled</title></circle>
<circle cx="143.7" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 55 stored, 100% recalled</title></circle>
<circle cx="152.8" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 60 stored, 100% recalled</title></circle>
<circle cx="161.8" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 65 stored, 100% recalled</title></circle>
<circle cx="170.9" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 70 stored, 100% recalled</title></circle>
<circle cx="179.9" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 75 stored, 100% recalled</title></circle>
<circle cx="189.0" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 80 stored, 100% recalled</title></circle>
<circle cx="198.1" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 85 stored, 100% recalled</title></circle>
<circle cx="207.1" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 90 stored, 100% recalled</title></circle>
<circle cx="216.2" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 95 stored, 100% recalled</title></circle>
<circle cx="225.3" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 100 stored, 100% recalled</title></circle>
<circle cx="234.3" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 105 stored, 100% recalled</title></circle>
<circle cx="243.4" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 110 stored, 100% recalled</title></circle>
<circle cx="252.4" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 115 stored, 100% recalled</title></circle>
<circle cx="261.5" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 120 stored, 100% recalled</title></circle>
<circle cx="270.6" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 125 stored, 100% recalled</title></circle>
<circle cx="279.6" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 130 stored, 100% recalled</title></circle>
<circle cx="288.7" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 135 stored, 100% recalled</title></circle>
<circle cx="297.8" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 140 stored, 100% recalled</title></circle>
<circle cx="306.8" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 145 stored, 100% recalled</title></circle>
<circle cx="315.9" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 150 stored, 100% recalled</title></circle>
<circle cx="324.9" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 155 stored, 100% recalled</title></circle>
<circle cx="334.0" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 160 stored, 100% recalled</title></circle>
<circle cx="343.1" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 165 stored, 100% recalled</title></circle>
<circle cx="352.1" cy="20.8" r="6" fill="transparent"><title>Pseudo-inverse: 170 stored, 100% recalled</title></circle>
<circle cx="361.2" cy="24.8" r="6" fill="transparent"><title>Pseudo-inverse: 175 stored, 98% recalled</title></circle>
<circle cx="370.3" cy="36.7" r="6" fill="transparent"><title>Pseudo-inverse: 180 stored, 93% recalled</title></circle>
<circle cx="379.3" cy="28.8" r="6" fill="transparent"><title>Pseudo-inverse: 185 stored, 97% recalled</title></circle>
<circle cx="388.4" cy="58.7" r="6" fill="transparent"><title>Pseudo-inverse: 190 stored, 84% recalled</title></circle>
<circle cx="397.4" cy="80.6" r="6" fill="transparent"><title>Pseudo-inverse: 195 stored, 75% recalled</title></circle>
<circle cx="406.5" cy="98.5" r="6" fill="transparent"><title>Pseudo-inverse: 200 stored, 68% recalled</title></circle>
<circle cx="415.6" cy="138.4" r="6" fill="transparent"><title>Pseudo-inverse: 205 stored, 51% recalled</title></circle>
<circle cx="424.6" cy="168.3" r="6" fill="transparent"><title>Pseudo-inverse: 210 stored, 38% recalled</title></circle>
<circle cx="433.7" cy="186.2" r="6" fill="transparent"><title>Pseudo-inverse: 215 stored, 31% recalled</title></circle>
<circle cx="442.8" cy="230.1" r="6" fill="transparent"><title>Pseudo-inverse: 220 stored, 13% recalled</title></circle>
<circle cx="451.8" cy="238.1" r="6" fill="transparent"><title>Pseudo-inverse: 225 stored, 9% recalled</title></circle>
<circle cx="460.9" cy="246.0" r="6" fill="transparent"><title>Pseudo-inverse: 230 stored, 6% recalled</title></circle>
<circle cx="469.9" cy="258.0" r="6" fill="transparent"><title>Pseudo-inverse: 235 stored, 1% recalled</title></circle>
<circle cx="479.0" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 240 stored, 0% recalled</title></circle>
<circle cx="488.1" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 245 stored, 0% recalled</title></circle>
<circle cx="497.1" cy="258.0" r="6" fill="transparent"><title>Pseudo-inverse: 250 stored, 1% recalled</title></circle>
<circle cx="506.2" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 255 stored, 0% recalled</title></circle>
<circle cx="515.3" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 260 stored, 0% recalled</title></circle>
<circle cx="524.3" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 265 stored, 0% recalled</title></circle>
<circle cx="533.4" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 270 stored, 0% recalled</title></circle>
<circle cx="542.4" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 275 stored, 0% recalled</title></circle>
<circle cx="551.5" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 280 stored, 0% recalled</title></circle>
<circle cx="560.6" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 285 stored, 0% recalled</title></circle>
<circle cx="569.6" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 290 stored, 0% recalled</title></circle>
<circle cx="578.7" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 295 stored, 0% recalled</title></circle>
<circle cx="587.8" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 300 stored, 0% recalled</title></circle>
<circle cx="596.8" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 305 stored, 0% recalled</title></circle>
<circle cx="605.9" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 310 stored, 0% recalled</title></circle>
<circle cx="614.9" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 315 stored, 0% recalled</title></circle>
<circle cx="624.0" cy="260.0" r="6" fill="transparent"><title>Pseudo-inverse: 320 stored, 0% recalled</title></circle>
<text x="261.5" y="260.0" dx="6" dy="4" fill="#a93fe0" text-anchor="start">Hebb</text>
<text x="406.5" y="228.1" dx="6" dy="4" fill="#c97c12" text-anchor="start">Storkey</text>
</svg>
<div class="hop-legend"><span><i style="background:#a93fe0"></i>Hebb</span><span><i style="background:#c97c12"></i>Storkey</span><span><i style="background:#35a066"></i>Pseudo-inverse</span></div>
<figcaption>Exact recall from a 10% scribble against the number of random patterns stored, for the three rules. n = 400, mean of three seeds, 40 patterns sampled per point. Hover a point for its value.</figcaption>
</figure>

The Hebb rule drops below 50% at 50 patterns and is effectively gone by 70. Storkey holds 100% to 120 and drops below 50% at 160. The pseudo-inverse holds 100% to 160 and then collapses at about 220, which is 0.55n, where the stored patterns stop being linearly independent enough for the inverse to be well behaved.

The most satisfying result in the whole thing is that you don't need spin-glass physics to predict my Hebb curve. When the network is sitting on a stored pattern, each neuron's input is the right answer plus the noise from every other stored pattern, and for random patterns that noise is roughly Gaussian with variance p/n. The chance a single pixel flips is then ½·erfc(√(n/2p)), and the chance that *none* of the 400 pixels flip is e<sup>−λ</sup> where λ is the expected number of flips. That back-of-the-envelope estimate matches the measurement at every point:

<div class="hop-table-wrap"><table class="hop-table">
<thead><tr><th class="num">patterns</th><th class="num">wrong pixels expected (λ)</th><th class="num">predicted e<sup>−λ</sup></th><th class="num">measured</th></tr></thead>
<tbody>
<tr><td class="num">30</td><td class="num">0.05</td><td class="num">95%</td><td class="num">94%</td></tr>
<tr><td class="num">40</td><td class="num">0.31</td><td class="num">73%</td><td class="num">75%</td></tr>
<tr><td class="num">50</td><td class="num">0.94</td><td class="num">39%</td><td class="num">39%</td></tr>
<tr><td class="num">55</td><td class="num">1.40</td><td class="num">25%</td><td class="num">25%</td></tr>
<tr><td class="num">60</td><td class="num">1.96</td><td class="num">14%</td><td class="num">22%</td></tr>
<tr><td class="num">70</td><td class="num">3.37</td><td class="num">3%</td><td class="num">1%</td></tr>
</tbody></table></div>

Which tells you something about what "capacity" means. At 55 patterns the network is only getting one or two pixels wrong on average. The 0.138 figure isn't where the memory becomes useless, it's where those one or two wrong pixels start knocking over their neighbours and the whole thing avalanches. If you allow the answer to be within 2% (8 pixels), the network is still getting 84% at 50 patterns and 60% at 60, and the drop-off is where the theory puts it.

<figure class="hop-figure">
<svg class="hop-svg" viewBox="0 0 640 300" role="img" aria-label="Hebb rule at three network sizes: recall (allowing 2% wrong pixels) against patterns per neuron" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>Hebb rule at three network sizes: recall (allowing 2% wrong pixels) against patterns per neuron</title>
<line x1="44" x2="624" y1="260.0" y2="260.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="260.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="140.4" y2="140.4" stroke="rgba(255,255,255,0.14)"/><text x="36" y="140.4" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0.5</text>
<line x1="44" x2="624" y1="20.8" y2="20.8" stroke="rgba(255,255,255,0.14)"/><text x="36" y="20.8" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<text x="44.0" y="278" fill="#8490b5" text-anchor="middle">0</text>
<text x="140.7" y="278" fill="#8490b5" text-anchor="middle">0.05</text>
<text x="237.3" y="278" fill="#8490b5" text-anchor="middle">0.1</text>
<text x="310.8" y="278" fill="#8490b5" text-anchor="middle">0.138</text>
<text x="430.7" y="278" fill="#8490b5" text-anchor="middle">0.2</text>
<text x="527.3" y="278" fill="#8490b5" text-anchor="middle">0.25</text>
<text x="624.0" y="278" fill="#8490b5" text-anchor="middle">0.3</text>
<path d="M44 16 V260 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<line x1="310.8" x2="310.8" y1="16" y2="260" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 4"/><text x="316.8" y="89.2" fill="#c3cadb"></text>
<text x="624" y="294" fill="#8490b5" text-anchor="end">patterns stored per neuron (p / n)</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">recalled (≤2% wrong)</text>
<path d="M82.7 20.8 L121.3 20.8 L160.0 20.8 L198.7 20.8 L237.3 20.8 L276.0 40.7 L314.7 89.1 L353.3 115.5 L392.0 167.0 L430.7 180.3 L469.3 234.6 L508.0 253.4 L546.7 247.7 L585.3 257.2 L624.0 254.7" fill="none" stroke="#35a066" stroke-width="2" stroke-linejoin="round"><title>n = 100</title></path>
<circle cx="82.7" cy="20.8" r="6" fill="transparent"><title>n = 100: p/n = 0.02, 100% recalled within 2%</title></circle>
<circle cx="121.3" cy="20.8" r="6" fill="transparent"><title>n = 100: p/n = 0.04, 100% recalled within 2%</title></circle>
<circle cx="160.0" cy="20.8" r="6" fill="transparent"><title>n = 100: p/n = 0.06, 100% recalled within 2%</title></circle>
<circle cx="198.7" cy="20.8" r="6" fill="transparent"><title>n = 100: p/n = 0.08, 100% recalled within 2%</title></circle>
<circle cx="237.3" cy="20.8" r="6" fill="transparent"><title>n = 100: p/n = 0.1, 100% recalled within 2%</title></circle>
<circle cx="276.0" cy="40.7" r="6" fill="transparent"><title>n = 100: p/n = 0.12, 92% recalled within 2%</title></circle>
<circle cx="314.7" cy="89.1" r="6" fill="transparent"><title>n = 100: p/n = 0.14, 71% recalled within 2%</title></circle>
<circle cx="353.3" cy="115.5" r="6" fill="transparent"><title>n = 100: p/n = 0.16, 60% recalled within 2%</title></circle>
<circle cx="392.0" cy="167.0" r="6" fill="transparent"><title>n = 100: p/n = 0.18, 39% recalled within 2%</title></circle>
<circle cx="430.7" cy="180.3" r="6" fill="transparent"><title>n = 100: p/n = 0.2, 33% recalled within 2%</title></circle>
<circle cx="469.3" cy="234.6" r="6" fill="transparent"><title>n = 100: p/n = 0.22, 11% recalled within 2%</title></circle>
<circle cx="508.0" cy="253.4" r="6" fill="transparent"><title>n = 100: p/n = 0.24, 3% recalled within 2%</title></circle>
<circle cx="546.7" cy="247.7" r="6" fill="transparent"><title>n = 100: p/n = 0.26, 5% recalled within 2%</title></circle>
<circle cx="585.3" cy="257.2" r="6" fill="transparent"><title>n = 100: p/n = 0.28, 1% recalled within 2%</title></circle>
<circle cx="624.0" cy="254.7" r="6" fill="transparent"><title>n = 100: p/n = 0.3, 2% recalled within 2%</title></circle>
<path d="M82.7 20.8 L121.3 20.8 L160.0 20.8 L198.7 20.8 L237.3 28.8 L276.0 48.7 L314.7 90.6 L353.3 146.4 L392.0 220.1 L430.7 248.0 L469.3 258.0 L508.0 260.0 L546.7 260.0 L585.3 260.0 L624.0 260.0" fill="none" stroke="#a93fe0" stroke-width="2" stroke-linejoin="round"><title>n = 400</title></path>
<circle cx="82.7" cy="20.8" r="6" fill="transparent"><title>n = 400: p/n = 0.02, 100% recalled within 2%</title></circle>
<circle cx="121.3" cy="20.8" r="6" fill="transparent"><title>n = 400: p/n = 0.04, 100% recalled within 2%</title></circle>
<circle cx="160.0" cy="20.8" r="6" fill="transparent"><title>n = 400: p/n = 0.06, 100% recalled within 2%</title></circle>
<circle cx="198.7" cy="20.8" r="6" fill="transparent"><title>n = 400: p/n = 0.08, 100% recalled within 2%</title></circle>
<circle cx="237.3" cy="28.8" r="6" fill="transparent"><title>n = 400: p/n = 0.1, 97% recalled within 2%</title></circle>
<circle cx="276.0" cy="48.7" r="6" fill="transparent"><title>n = 400: p/n = 0.12, 88% recalled within 2%</title></circle>
<circle cx="314.7" cy="90.6" r="6" fill="transparent"><title>n = 400: p/n = 0.14, 71% recalled within 2%</title></circle>
<circle cx="353.3" cy="146.4" r="6" fill="transparent"><title>n = 400: p/n = 0.16, 48% recalled within 2%</title></circle>
<circle cx="392.0" cy="220.1" r="6" fill="transparent"><title>n = 400: p/n = 0.18, 17% recalled within 2%</title></circle>
<circle cx="430.7" cy="248.0" r="6" fill="transparent"><title>n = 400: p/n = 0.2, 5% recalled within 2%</title></circle>
<circle cx="469.3" cy="258.0" r="6" fill="transparent"><title>n = 400: p/n = 0.22, 1% recalled within 2%</title></circle>
<circle cx="508.0" cy="260.0" r="6" fill="transparent"><title>n = 400: p/n = 0.24, 0% recalled within 2%</title></circle>
<circle cx="546.7" cy="260.0" r="6" fill="transparent"><title>n = 400: p/n = 0.26, 0% recalled within 2%</title></circle>
<circle cx="585.3" cy="260.0" r="6" fill="transparent"><title>n = 400: p/n = 0.28, 0% recalled within 2%</title></circle>
<circle cx="624.0" cy="260.0" r="6" fill="transparent"><title>n = 400: p/n = 0.3, 0% recalled within 2%</title></circle>
<path d="M82.7 20.8 L121.3 20.8 L160.0 20.8 L198.7 20.8 L237.3 20.8 L276.0 24.8 L314.7 76.6 L353.3 178.3 L392.0 252.0 L430.7 256.0 L469.3 260.0 L508.0 260.0 L546.7 260.0 L585.3 260.0 L624.0 260.0" fill="none" stroke="#c97c12" stroke-width="2" stroke-linejoin="round"><title>n = 900</title></path>
<circle cx="82.7" cy="20.8" r="6" fill="transparent"><title>n = 900: p/n = 0.02, 100% recalled within 2%</title></circle>
<circle cx="121.3" cy="20.8" r="6" fill="transparent"><title>n = 900: p/n = 0.04, 100% recalled within 2%</title></circle>
<circle cx="160.0" cy="20.8" r="6" fill="transparent"><title>n = 900: p/n = 0.06, 100% recalled within 2%</title></circle>
<circle cx="198.7" cy="20.8" r="6" fill="transparent"><title>n = 900: p/n = 0.08, 100% recalled within 2%</title></circle>
<circle cx="237.3" cy="20.8" r="6" fill="transparent"><title>n = 900: p/n = 0.1, 100% recalled within 2%</title></circle>
<circle cx="276.0" cy="24.8" r="6" fill="transparent"><title>n = 900: p/n = 0.12, 98% recalled within 2%</title></circle>
<circle cx="314.7" cy="76.6" r="6" fill="transparent"><title>n = 900: p/n = 0.14, 77% recalled within 2%</title></circle>
<circle cx="353.3" cy="178.3" r="6" fill="transparent"><title>n = 900: p/n = 0.16, 34% recalled within 2%</title></circle>
<circle cx="392.0" cy="252.0" r="6" fill="transparent"><title>n = 900: p/n = 0.18, 3% recalled within 2%</title></circle>
<circle cx="430.7" cy="256.0" r="6" fill="transparent"><title>n = 900: p/n = 0.2, 2% recalled within 2%</title></circle>
<circle cx="469.3" cy="260.0" r="6" fill="transparent"><title>n = 900: p/n = 0.22, 0% recalled within 2%</title></circle>
<circle cx="508.0" cy="260.0" r="6" fill="transparent"><title>n = 900: p/n = 0.24, 0% recalled within 2%</title></circle>
<circle cx="546.7" cy="260.0" r="6" fill="transparent"><title>n = 900: p/n = 0.26, 0% recalled within 2%</title></circle>
<circle cx="585.3" cy="260.0" r="6" fill="transparent"><title>n = 900: p/n = 0.28, 0% recalled within 2%</title></circle>
<circle cx="624.0" cy="260.0" r="6" fill="transparent"><title>n = 900: p/n = 0.3, 0% recalled within 2%</title></circle>
</svg>
<div class="hop-legend"><span><i style="background:#35a066"></i>n = 100</span><span><i style="background:#a93fe0"></i>n = 400</span><span><i style="background:#c97c12"></i>n = 900</span></div>
<figcaption>Hebb rule at three sizes, with the recall counted as correct if at most 2% of the pixels are wrong. The x-axis is patterns per neuron. Bigger networks have a sharper cliff, closer to 0.138.</figcaption>
</figure>

Running the same test at n = 100, 400 and 900 shows the cliff sharpening as the network grows. At 900 neurons it's still at 98% at 0.12 patterns per neuron and down to 34% by 0.16. The 100-neuron network is soft everywhere, still getting a third of its patterns back at 0.2. So the number is a limit, and a 400-neuron toy is only roughly there.

### The basins shrink before the cliff

Capacity is the wrong thing to worry about anyway, because a memory you can only recall from a perfect copy isn't a memory. What matters is how much damage the network can undo, and that gets worse well before the patterns stop being stable.

<figure class="hop-figure">
<svg class="hop-svg" viewBox="0 0 640 300" role="img" aria-label="How much corruption the Hebb rule can undo, for 10, 30 and 50 stored patterns, n = 400" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12">
<title>How much corruption the Hebb rule can undo, for 10, 30 and 50 stored patterns, n = 400</title>
<line x1="44" x2="624" y1="260.0" y2="260.0" stroke="rgba(255,255,255,0.14)"/><text x="36" y="260.0" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0</text>
<line x1="44" x2="624" y1="140.4" y2="140.4" stroke="rgba(255,255,255,0.14)"/><text x="36" y="140.4" fill="#8490b5" text-anchor="end" dominant-baseline="middle">0.5</text>
<line x1="44" x2="624" y1="20.8" y2="20.8" stroke="rgba(255,255,255,0.14)"/><text x="36" y="20.8" fill="#8490b5" text-anchor="end" dominant-baseline="middle">1</text>
<text x="44.0" y="278" fill="#8490b5" text-anchor="middle">0</text>
<text x="160.0" y="278" fill="#8490b5" text-anchor="middle">0.1</text>
<text x="276.0" y="278" fill="#8490b5" text-anchor="middle">0.2</text>
<text x="392.0" y="278" fill="#8490b5" text-anchor="middle">0.3</text>
<text x="508.0" y="278" fill="#8490b5" text-anchor="middle">0.4</text>
<text x="624.0" y="278" fill="#8490b5" text-anchor="middle">0.5</text>
<path d="M44 16 V260 H624" fill="none" stroke="rgba(255,255,255,0.14)"/>
<text x="624" y="294" fill="#8490b5" text-anchor="end">fraction of pixels flipped before recall</text>
<text transform="translate(12 16) rotate(-90)" fill="#8490b5" text-anchor="end">recalled</text>
<path d="M44.0 20.8 L102.0 20.8 L160.0 20.8 L218.0 20.8 L276.0 20.8 L334.0 20.8 L392.0 20.8 L450.0 20.8 L508.0 28.8 L566.0 204.2 L624.0 260.0" fill="none" stroke="#35a066" stroke-width="2" stroke-linejoin="round"><title>10 patterns stored</title></path>
<circle cx="44.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 0% corrupted, 100% recalled</title></circle>
<circle cx="102.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 5% corrupted, 100% recalled</title></circle>
<circle cx="160.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 10% corrupted, 100% recalled</title></circle>
<circle cx="218.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 15% corrupted, 100% recalled</title></circle>
<circle cx="276.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 20% corrupted, 100% recalled</title></circle>
<circle cx="334.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 25% corrupted, 100% recalled</title></circle>
<circle cx="392.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 30% corrupted, 100% recalled</title></circle>
<circle cx="450.0" cy="20.8" r="6" fill="transparent"><title>10 patterns stored: 35% corrupted, 100% recalled</title></circle>
<circle cx="508.0" cy="28.8" r="6" fill="transparent"><title>10 patterns stored: 40% corrupted, 97% recalled</title></circle>
<circle cx="566.0" cy="204.2" r="6" fill="transparent"><title>10 patterns stored: 45% corrupted, 23% recalled</title></circle>
<circle cx="624.0" cy="260.0" r="6" fill="transparent"><title>10 patterns stored: 50% corrupted, 0% recalled</title></circle>
<path d="M44.0 28.8 L102.0 28.8 L160.0 28.8 L218.0 31.4 L276.0 31.4 L334.0 36.7 L392.0 44.7 L450.0 113.8 L508.0 236.1 L566.0 257.3 L624.0 260.0" fill="none" stroke="#c97c12" stroke-width="2" stroke-linejoin="round"><title>30 patterns stored</title></path>
<circle cx="44.0" cy="28.8" r="6" fill="transparent"><title>30 patterns stored: 0% corrupted, 97% recalled</title></circle>
<circle cx="102.0" cy="28.8" r="6" fill="transparent"><title>30 patterns stored: 5% corrupted, 97% recalled</title></circle>
<circle cx="160.0" cy="28.8" r="6" fill="transparent"><title>30 patterns stored: 10% corrupted, 97% recalled</title></circle>
<circle cx="218.0" cy="31.4" r="6" fill="transparent"><title>30 patterns stored: 15% corrupted, 96% recalled</title></circle>
<circle cx="276.0" cy="31.4" r="6" fill="transparent"><title>30 patterns stored: 20% corrupted, 96% recalled</title></circle>
<circle cx="334.0" cy="36.7" r="6" fill="transparent"><title>30 patterns stored: 25% corrupted, 93% recalled</title></circle>
<circle cx="392.0" cy="44.7" r="6" fill="transparent"><title>30 patterns stored: 30% corrupted, 90% recalled</title></circle>
<circle cx="450.0" cy="113.8" r="6" fill="transparent"><title>30 patterns stored: 35% corrupted, 61% recalled</title></circle>
<circle cx="508.0" cy="236.1" r="6" fill="transparent"><title>30 patterns stored: 40% corrupted, 10% recalled</title></circle>
<circle cx="566.0" cy="257.3" r="6" fill="transparent"><title>30 patterns stored: 45% corrupted, 1% recalled</title></circle>
<circle cx="624.0" cy="260.0" r="6" fill="transparent"><title>30 patterns stored: 50% corrupted, 0% recalled</title></circle>
<path d="M44.0 164.3 L102.0 172.3 L160.0 172.3 L218.0 172.3 L276.0 196.2 L334.0 222.8 L392.0 233.4 L450.0 257.3 L508.0 260.0 L566.0 260.0 L624.0 260.0" fill="none" stroke="#a93fe0" stroke-width="2" stroke-linejoin="round"><title>50 patterns stored</title></path>
<circle cx="44.0" cy="164.3" r="6" fill="transparent"><title>50 patterns stored: 0% corrupted, 40% recalled</title></circle>
<circle cx="102.0" cy="172.3" r="6" fill="transparent"><title>50 patterns stored: 5% corrupted, 37% recalled</title></circle>
<circle cx="160.0" cy="172.3" r="6" fill="transparent"><title>50 patterns stored: 10% corrupted, 37% recalled</title></circle>
<circle cx="218.0" cy="172.3" r="6" fill="transparent"><title>50 patterns stored: 15% corrupted, 37% recalled</title></circle>
<circle cx="276.0" cy="196.2" r="6" fill="transparent"><title>50 patterns stored: 20% corrupted, 27% recalled</title></circle>
<circle cx="334.0" cy="222.8" r="6" fill="transparent"><title>50 patterns stored: 25% corrupted, 16% recalled</title></circle>
<circle cx="392.0" cy="233.4" r="6" fill="transparent"><title>50 patterns stored: 30% corrupted, 11% recalled</title></circle>
<circle cx="450.0" cy="257.3" r="6" fill="transparent"><title>50 patterns stored: 35% corrupted, 1% recalled</title></circle>
<circle cx="508.0" cy="260.0" r="6" fill="transparent"><title>50 patterns stored: 40% corrupted, 0% recalled</title></circle>
<circle cx="566.0" cy="260.0" r="6" fill="transparent"><title>50 patterns stored: 45% corrupted, 0% recalled</title></circle>
<circle cx="624.0" cy="260.0" r="6" fill="transparent"><title>50 patterns stored: 50% corrupted, 0% recalled</title></circle>
</svg>
<div class="hop-legend"><span><i style="background:#35a066"></i>10 stored</span><span><i style="background:#c97c12"></i>30 stored</span><span><i style="background:#a93fe0"></i>50 stored</span></div>
<figcaption>How badly scribbled a pattern can be and still come back exactly, for 10, 30 and 50 stored patterns. n = 400, Hebb rule.</figcaption>
</figure>

With 10 patterns stored the network recovers from having **40%** of its pixels flipped, 97% of the time. That surprised me. Flip 45% and it's down to 23%, and at 50% you've given it a coin toss, so it goes to whichever memory is nearest by luck. With 30 stored it's fine to 30% and gone by 40%. With 50 stored it only gets 40% back from a perfect copy, because most of the patterns aren't stable any more.

### From nowhere in particular

If you start the network from a random state instead of a scribbled memory, it still rolls downhill, but there's no guarantee it lands in a valley you dug. With 20 patterns stored, well under capacity, I ran 2,000 random starts:

<div class="hop-table-wrap"><table class="hop-table">
<thead><tr><th>ended up at</th><th class="num">share</th></tr></thead>
<tbody>
<tr><td>a stored pattern</td><td class="num">26%</td></tr>
<tr><td>the exact inverse of a stored pattern (every pixel flipped)</td><td class="num">24%</td></tr>
<tr><td>a mixture of three or more patterns</td><td class="num">49%</td></tr>
<tr><td>something else</td><td class="num">2%</td></tr>
</tbody></table></div>

Half the time it invents a memory that was never stored, by blending three of them, and a quarter of the time it produces a photographic negative. Those 2,000 starts ended at 859 different states, from a network holding 20 pictures. The inverse ones are unavoidable: the energy of a state and its negative are identical under this rule, so every valley you dig comes with a mirror-image valley for free. The mixtures are the "spurious states" from the literature, and one of the things a better learning rule is judged on is how many of them it adds. It also took an average of 11 sweeps to settle from a random start, against two from a scribbled memory, which is the difference between being halfway up one valley and being on a ridge between several.

### Pictures are worse than noise

The six pictures are the numbers that made me understand the whole thing. The average overlap between two random 400-pixel patterns is 0.04, which is the noise the theory assumes. The average overlap between two of my pictures is **0.44**, and the sheep and the heart agree on 82% of their pixels. So each picture is a fully-fledged signal pulling every other picture towards it, not noise.

<div class="hop-table-wrap"><table class="hop-table">
<thead><tr><th>pictures stored (in library order)</th><th class="num">Hebb</th><th class="num">Storkey</th><th class="num">Pseudo-inverse</th></tr></thead>
<tbody>
<tr><td>sheep, dog</td><td class="num">2 / 2</td><td class="num">2 / 2</td><td class="num">2 / 2</td></tr>
<tr><td>+ tree</td><td class="num">3 / 3, shakily (90%, 95%, 75%)</td><td class="num">3 / 3</td><td class="num">3 / 3</td></tr>
<tr><td>+ house</td><td class="num">0 / 4</td><td class="num">4 / 4</td><td class="num">4 / 4</td></tr>
<tr><td>+ heart</td><td class="num">0 / 5</td><td class="num">4 / 5 (sheep lost)</td><td class="num">5 / 5</td></tr>
<tr><td>+ sun</td><td class="num">0 / 6</td><td class="num">3 / 6 (dog 55%, tree 80%)</td><td class="num">6 / 6</td></tr>
</tbody></table></div>

Under the Hebb rule every pair of pictures is fine, 12 of the 20 possible triples are fine, and no set of four works at all. Which triples fail is about overlap, not count: sheep, dog and house is solid, and sheep, dog and heart loses the sheep and the heart entirely, because those two are the same blob in the same place. Storkey gets to four and then loses the sheep to the heart as well. Only the pseudo-inverse, which is allowed to look at all the pictures together, holds all six, and that's because the pictures are only six vectors in a 400-dimensional space, so they're trivially independent and the inverse doesn't care how similar they look.

### The attention version

The dense network is a different animal. With β = 0.1 it stores 4,000 random patterns in 400 neurons and recovers every one of them from a 30% scribble, which the Hebb rule can't do for 50. Where it fails is when the query gets close to random: at 45% flipped almost nothing works, because a pattern that shares 55% of its pixels with the answer only barely prefers it to a stranger.

<div class="hop-table-wrap"><table class="hop-table">
<thead><tr><th class="num">patterns stored</th><th class="num">10% flipped</th><th class="num">30% flipped</th><th class="num">40% flipped</th><th class="num">45% flipped</th></tr></thead>
<tbody>
<tr><td class="num">50</td><td class="num">100%</td><td class="num">100%</td><td class="num">100%</td><td class="num">33%</td></tr>
<tr><td class="num">200</td><td class="num">100%</td><td class="num">100%</td><td class="num">100%</td><td class="num">0%</td></tr>
<tr><td class="num">1,000</td><td class="num">100%</td><td class="num">100%</td><td class="num">100%</td><td class="num">0%</td></tr>
<tr><td class="num">4,000</td><td class="num">100%</td><td class="num">100%</td><td class="num">0%</td><td class="num">0%</td></tr>
</tbody></table></div>

The sharpness β behaves like a switch rather than a dial. On the six pictures plus 200 random ones, recall from a 30% scribble is 0% at β = 0.02 and 100% at β = 0.05, with nothing in between, and the top memory's share of the attention goes from 1% to 100% at the same point. Below the switch the softmax is spread across everything and you get the blurred average from the demo. Above it the softmax is a hard lookup. In a transformer the same knob is the scaling in front of the softmax, and this is a picture of what sits at either end of it.

### What each rule costs

<div class="hop-table-wrap"><table class="hop-table">
<thead><tr><th>rule</th><th>needs to know</th><th class="num">stores (n = 400)</th><th class="num">ms per store at p = 100</th></tr></thead>
<tbody>
<tr><td>Hebb</td><td>the picture, once</td><td class="num">~50</td><td class="num">0.3</td></tr>
<tr><td>Storkey</td><td>the picture, and what the network currently thinks</td><td class="num">~160</td><td class="num">1.5</td></tr>
<tr><td>Pseudo-inverse</td><td>every picture ever stored, all at once</td><td class="num">~220</td><td class="num">40.6</td></tr>
<tr><td>Dense</td><td>nothing, it keeps the pictures</td><td class="num">thousands</td><td class="num">0.008</td></tr>
</tbody></table></div>

The pattern in that table is the point of the post. Every step up in capacity is paid for with locality. Hebb needs only the picture in front of it and can forget it afterwards; that's a rule a neuron could run. Storkey needs to know what it already believes. The pseudo-inverse needs the whole history back. The dense network needs nothing because it does no compression at all: the "store" is a copy, and every recall is a scan of everything it's ever seen. It's the fastest to store and the only one whose recall cost grows with the number of memories.

### What I'd want to check before trusting any of this

- Everything is at n = 400 except the one size comparison. The theory is a large-n statement and my network is small, so the cliffs are softer than they'd be in a real system.
- "Corrupted" here always means randomly flipped pixels. Real damage is structured: a block missing, a shape shifted a pixel to the right. The **Rub out half** button is the only structured case I tried, and the network handles it well because the intact half is a strong enough cue, but I haven't measured it.
- I used asynchronous updates in random order. Synchronous updates (everyone at once) can oscillate between two states forever, which is a well-known difference and would change the numbers.
- Three seeds and 40 samples per point is enough to see the shape and not enough to trust the second digit. The Poisson agreement is closer than I'd expect at that sample size, so some of it is luck.
- The pictures are mine and there are six of them. A different set with less overlap would make the Hebb rule look better; I checked that by noting which triples fail, but I haven't tried, say, letters.
- The timings are one laptop, one run, unoptimised JavaScript, and they compare rules whose costs scale differently with p, so read them as ratios at p = 100 and nothing more.

## What I took from it

The learning rule fitted on a postcard, and so did the recall rule, and so did the reason it works. That was the aim. What I didn't expect was how much the failures taught me. The network isn't bad at remembering, it's bad at remembering *similar things*, and every improvement to it is some version of paying attention to what it already knows before adding more. That's true of the Storkey rule, it's true of the pseudo-inverse, and it's true of the attention block in a transformer, which turned out to be sitting at the end of the road.

The other thing is that "learning" and "remembering" pulled apart the further I went. The Hebb network learns and can't remember much; the dense network remembers everything and doesn't learn at all. The models in the middle trade one for the other. I don't think that's a coincidence, and I don't think it stops at toy networks.

<script type="module" src="/sim/hopfield.js"></script>
<style>
  .hop { margin: 1.5rem 0; }
  .hop-main { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .hop-grid {
    display: block; touch-action: none; cursor: crosshair; flex: 0 0 auto;
    border-radius: 1rem; border: 1px solid var(--gray-800); background: #0e1711;
  }
  .hop-side { flex: 1 1 200px; min-width: 200px; display: flex; flex-direction: column; gap: 0.4rem; }
  .hop-side-narrow { flex: 0 1 220px; }
  .hop-label { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); margin-top: 0.4rem; }
  .hop-label span { color: var(--gray-400); margin-left: 0.4rem; }
  .hop-thumbs { display: flex; flex-wrap: wrap; gap: 0.35rem; min-height: 40px; }
  .hop-thumb { border-radius: 4px; border: 1px solid var(--gray-800); cursor: pointer; image-rendering: pixelated; }
  .hop-thumb:hover { border-color: var(--accent-light); }
  .hop-row { display: flex; gap: 0.75rem; align-items: flex-end; margin-top: 0.4rem; }
  .hop-weights { width: 90px; height: 90px; flex: 0 0 auto; border-radius: 6px; border: 1px solid var(--gray-800); image-rendering: pixelated; }
  .hop-chart { flex: 1 1 auto; width: 100%; height: 90px; display: block; }
  .hop-chart-big { flex: 1 1 320px; width: 100%; height: 240px; display: block; border-radius: 1rem; border: 1px solid var(--gray-800); background: #0e1711; }
  .hop-hud {
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-top: 0.6rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300);
  }
  .hop-stats { color: var(--gray-400); white-space: nowrap; }
  .hop-controls {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.6rem; font-size: var(--text-sm);
  }
  .hop-controls button, .hop-controls select {
    font: inherit; padding: 0.35rem 0.8rem; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--gray-700); background: var(--gray-900); color: var(--gray-200);
  }
  .hop-controls button[aria-pressed="true"] { border-color: var(--accent-light); color: var(--accent-light); }
  .hop-controls button:hover { border-color: var(--gray-500); }
  .hop-controls label { color: var(--gray-400); display: flex; gap: 0.35rem; align-items: center; cursor: pointer; }
  .hop-slider input { width: 120px; accent-color: var(--accent-light); }
  .hop-pairs { display: flex; flex-direction: column; gap: 0.3rem; }
  .hop-pair { display: flex; gap: 0.4rem; align-items: center; font-family: var(--font-mono); font-size: var(--text-sm); }
  .hop-pair .hop-thumb { cursor: default; }
  .hop-pair.ok span { color: #7dd3a0; }
  .hop-pair.bad span { color: #ffb454; }
  .hop-attention { display: flex; flex-direction: column; gap: 0.3rem; }
  .hop-att { display: flex; gap: 0.5rem; align-items: center; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .hop-att .hop-thumb { cursor: default; }
  .hop-att-bar { flex: 1 1 auto; height: 6px; background: var(--gray-900); border-radius: 3px; overflow: hidden; }
  .hop-att-bar i { display: block; height: 100%; background: var(--accent-light); }
  .hop-att b { color: var(--gray-0); font-weight: 600; min-width: 3.5ch; text-align: right; }
  .hop-att-rest { color: var(--gray-400); }
  .hop-legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gray-300); }
  .hop-legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
  .hop-legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; }
  .hop-svg { display: block; width: 100%; height: auto; margin-top: 1rem; }
  .hop-figure { margin: 1.5rem 0; }
  .hop-figure figcaption { font-size: var(--text-sm); color: var(--gray-400); margin-top: 0.5rem; }
  .hop-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); margin: 1rem 0; }
  .hop-table th, .hop-table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--gray-800); }
  .hop-table th { color: var(--gray-300); font-weight: 500; font-family: var(--font-mono); }
  .hop-table td.num, .hop-table th.num { text-align: right; font-family: var(--font-mono); }
  .hop-table-wrap { overflow-x: auto; }
</style>

---

*Sources: Hopfield J.J. (1982). [Neural networks and physical systems with emergent collective computational abilities](https://www.pnas.org/doi/10.1073/pnas.79.8.2554). PNAS 79(8). Amit D.J., Gutfreund H. & Sompolinsky H. (1985). [Storing infinite numbers of patterns in a spin-glass model of neural networks](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.55.1530). Phys. Rev. Lett. 55. Storkey A. (1997). [Increasing the capacity of a Hopfield network without sacrificing functionality](https://link.springer.com/chapter/10.1007/BFb0020196). ICANN. Personnaz L., Guyon I. & Dreyfus G. (1985). Information storage and retrieval in spin-glass like neural networks. J. Physique Lett. 46. Krotov D. & Hopfield J.J. (2016). [Dense associative memory for pattern recognition](https://arxiv.org/abs/1606.01164). NeurIPS. Ramsauer H. et al. (2020). [Hopfield networks is all you need](https://arxiv.org/abs/2008.02217). ICLR 2021. The pictures, the demos and the experiments are mine. [Model](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/hopfield-core.js) · [demos](https://github.com/samllbrown/samuellbrown.dev/blob/main/public/sim/hopfield.js) · [experiment script](https://github.com/samllbrown/samuellbrown.dev/blob/main/scripts/hopfield-experiments.mjs).*
