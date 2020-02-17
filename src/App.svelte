<script>
  export let name;
</script>

<main>
  <h1>freda's page</h1>
  <p>* a programmer based in chinatown, nyc</p>
  <a href="/blog">blog</a>
  <h2>projects</h2>
  <ul>
    <li><a href="/sequencer">sequencer</a></li>
    <li><a href="/magiclamp">mock terminal</a></li>
  </ul>
  <h2>archive</h2>
  <ul>
    <li><a href="/2017">2017</a></li>
    <li><a href="/2016">2016</a></li>
  </ul>
  <h2>sketches</h2>
  <ul>
    <li><a href="/grammar">rita + processing</a></li>
    <li><a href="/2048">functional 2048</a></li>
  </ul>
</main>
<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    font-size: 4em;
    font-weight: 100;
  }

  h2 {
    color: #bada55;
    font-weight: normal;
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
