async function run() {
  const res = await fetch(`https://itunes.apple.com/search?term=Arijit%20Singh%20Tum%20Hi%20Ho&entity=song&limit=1`);
  const json = await res.json();
  console.log(json.results[0].previewUrl);
}
run();
