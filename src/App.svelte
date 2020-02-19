<script>
  import Social from './Social.svelte';
</script>

<!--
<div class="circle-pink" />
  <div class="circle-orange" />
    -->

<main>
  <img alt="photo of freda" src="/pic.png" height="400px" />
  <h2>freda suyi ding</h2>

  <p>
    is a computer programmer based in chinatown, nyc.
  </p>
  <p>
    they are interested in frameworks for social progress, expressiveness of
    code, and experimenting with ways of thinking.
  </p>
  <div>
    <Social />
  </div>

  <ol>
    <li><h2>web</h2></li>
    <ul>
      <li><a href="/modes">webmidi piano w modes</a></li>
      <li><a href="/2048">elm + 2048</a></li>
      <li><a href="/sequencer">sequencer</a></li>
      <li>
        <a href="https://iso-note.herokuapp.com/">markdown + html converter</a>
      </li>
      <li><a href="/magiclamp">web terminal</a></li>
      <li>
        <a href="https://vespertine-rhythms.herokuapp.com/">connect places</a>
      </li>
    </ul>

    <li><h2>sketchbook</h2></li>
    <ul>
      <li><a href="/grammar">rita + processing</a></li>
      <li><a href="http://tilde.learning-gardens.co/~freda/">tilde club</a></li>
    </ul>

    <li><h2>archive</h2></li>
    <ul>
      <li><a href="/2017">2017</a></li>
      <li><a href="/2016">2016</a></li>
    </ul>
  </ol>
</main>
<style>
  main {
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
    position: relative;
  }

  .bar {
    height: 10px;
    width: 100%;
    margin-bottom: 1em;
  }

  .grey {
    background-color: lightgrey;
  }

  .black {
    background-color: black;
  }

  .circle-orange {
    position: absolute;
    margin: 0;
    bottom: -20%;
    right: 10%;
    height: 70%;
    width: 30%;
    background-color: orange;
    border-radius: 50%;
    filter: blur(80px);
    z-index: -1;
  }

  .circle-pink {
    position: absolute;
    margin: 0;
    height: 100%;
    width: 33%;
    background-color: pink;
    border-radius: 50%;
    filter: blur(100px);
    z-index: -1;
    animation-name: blob;
    animation-duration: 10s;
    animation-iteration-count: infinite;
  }

  @keyframes blob {
    0% {
      height: 50%;
      left: 30%;
    }
    30% {
      height: 40%;
      left: 30%;
    }
    68% {
      height: 60%;
      left: 35%;
    }
    72% {
      height: 50%;
      left: 30%;
    }
    100% {
      height: 80%;
      left: 65%;
    }
  }

  h1 {
    font-size: 4em;
    font-weight: 100;
  }
  h2 {
    font-size: 1em;
  }

  h4 {
    color: black;
    font-weight: normal;
  }

  ol {
    list-style-type: cjk-earthly-branch;
  }

  ul {
    padding: 0;
  }

  ul > li {
    list-style: none;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
