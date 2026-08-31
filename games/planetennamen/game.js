import { registerServiceWorker } from "../../shared/utils/pwa.js";

const system = document.querySelector("#orbit-system");
const panel = document.querySelector("#planet-panel");
const closeButton = document.querySelector("#close-panel");
const photo = document.querySelector("#planet-photo");
const kind = document.querySelector("#planet-kind");
const name = document.querySelector("#planet-name");
const info = document.querySelector("#planet-info");
const credit = document.querySelector("#planet-credit");

const languages = [
  ["de", "Deutsch"],
  ["sk", "Slovensky"],
];

const bodies = [
  {
    id: "mercury",
    name: { de: "Merkur", sk: "Merkúr" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 15,
    y: 51,
    w: 46,
    h: 46,
    orbit: 24,
    photo: "./assets/mercury-cutout.webp",
    glow: "rgba(183, 162, 122, 0.55)",
    credit: "Bildquelle: NASA/JHUAPL/Carnegie Institution of Washington, MESSENGER",
    info: {
      de: {
        intro: "Merkur ist der kleinste Planet und kreist am nächsten um die Sonne.",
        facts: [["Monde", "keine"], ["Oberfläche", "felsig"], ["Ein Jahr", "88 Erdentage"], ["Besonders", "starke Temperaturunterschiede"]],
        readout: "Tagsüber ist es sehr heiß und nachts sehr kalt, weil Merkur fast keine schützende Atmosphäre hat.",
      },
      sk: {
        intro: "Merkúr je najmenšia planéta a obieha najbližšie pri Slnku.",
        facts: [["Mesiace", "žiadne"], ["Povrch", "skalnatý"], ["Jeden rok", "88 pozemských dní"], ["Zaujímavosť", "veľké rozdiely teplôt"]],
        readout: "Cez deň je tam veľmi horúco a v noci veľmi chladno, pretože Merkúr má takmer žiadnu ochrannú atmosféru.",
      },
    },
  },
  {
    id: "venus",
    name: { de: "Venus", sk: "Venuša" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 25,
    y: 39.8,
    w: 66,
    h: 66,
    orbit: 34,
    photo: "./assets/venus-cutout.webp",
    glow: "rgba(228, 150, 70, 0.62)",
    credit: "Bildquelle: NASA/JPL-Caltech, Magellan",
    info: {
      de: {
        intro: "Venus ist fast so groß wie die Erde, aber viel heißer.",
        facts: [["Drehung", "rückwärts"], ["Wolken", "sehr dicht"], ["Ein Tag", "länger als ein Jahr"], ["Besonders", "heißester Planet"]],
        readout: "Die Venus ist von dichten Wolken umgeben. Darunter ist es so heiß, dass Blei schmelzen würde.",
      },
      sk: {
        intro: "Venuša je takmer taká veľká ako Zem, ale je oveľa horúcejšia.",
        facts: [["Otáčanie", "opačným smerom"], ["Oblaky", "veľmi husté"], ["Jeden deň", "dlhší ako rok"], ["Zaujímavosť", "najhorúcejšia planéta"]],
        readout: "Venušu obklopujú husté oblaky. Pod nimi je tak horúco, že by sa roztavilo olovo.",
      },
    },
  },
  {
    id: "earth",
    name: { de: "Erde", sk: "Zem" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 35,
    y: 61,
    w: 72,
    h: 72,
    orbit: 45,
    photo: "./assets/earth-cutout.webp",
    glow: "rgba(90, 174, 255, 0.72)",
    credit: "Bildquelle: NASA Johnson Space Center, Apollo 17",
    info: {
      de: {
        intro: "Die Erde ist unser Zuhause und hat flüssiges Wasser an der Oberfläche.",
        facts: [["Monde", "1"], ["Oberfläche", "Wasser und Land"], ["Ein Jahr", "365 Tage"], ["Besonders", "Leben"]],
        readout: "Die Erde hat Luft zum Atmen, Ozeane und passende Bedingungen für viele Lebewesen.",
      },
      sk: {
        intro: "Zem je náš domov a na jej povrchu je tekutá voda.",
        facts: [["Mesiace", "1"], ["Povrch", "voda a pevnina"], ["Jeden rok", "365 dní"], ["Zaujímavosť", "život"]],
        readout: "Zem má vzduch na dýchanie, oceány a vhodné podmienky pre mnoho živých tvorov.",
      },
    },
  },
  {
    id: "moon",
    name: { de: "Mond", sk: "Mesiac" },
    kind: { de: "Mond der Erde", sk: "Mesiac Zeme" },
    x: 39,
    y: 53,
    w: 32,
    h: 32,
    orbit: 45,
    photo: "./assets/moon-cutout.webp",
    glow: "rgba(230, 230, 230, 0.58)",
    credit: "Bildquelle: NASA / Lick Observatory",
    info: {
      de: {
        intro: "Der Mond umkreist die Erde und ist nachts oft gut zu sehen.",
        facts: [["Abstand", "ca. 384.000 km"], ["Oberfläche", "Krater und Staub"], ["Umlauf", "etwa 27 Tage"], ["Besonders", "besucht von Menschen"]],
        readout: "Der Mond leuchtet nicht selbst. Wir sehen Sonnenlicht, das von seiner Oberfläche zurückgeworfen wird.",
      },
      sk: {
        intro: "Mesiac obieha okolo Zeme a v noci ho často dobre vidíme.",
        facts: [["Vzdialenosť", "asi 384 000 km"], ["Povrch", "krátery a prach"], ["Obeh", "asi 27 dní"], ["Zaujímavosť", "navštívili ho ľudia"]],
        readout: "Mesiac nesvieti sám. Vidíme slnečné svetlo, ktoré sa odráža od jeho povrchu.",
      },
    },
  },
  {
    id: "mars",
    name: { de: "Mars", sk: "Mars" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 46,
    y: 35.3,
    w: 56,
    h: 56,
    orbit: 56,
    photo: "./assets/mars-cutout.webp",
    glow: "rgba(224, 88, 70, 0.64)",
    credit: "Bildquelle: NASA/JPL-Caltech, Viking",
    info: {
      de: {
        intro: "Mars ist der rote Planet und hat Staub, Berge und alte Spuren von Wasser.",
        facts: [["Monde", "2"], ["Farbe", "rot-orange"], ["Ein Jahr", "687 Erdentage"], ["Besonders", "größter Vulkan"]],
        readout: "Roboterfahrzeuge erforschen den Mars und suchen Hinweise, ob dort früher einmal Leben möglich war.",
      },
      sk: {
        intro: "Mars je červená planéta s prachom, horami a starými stopami vody.",
        facts: [["Mesiace", "2"], ["Farba", "červeno-oranžová"], ["Jeden rok", "687 pozemských dní"], ["Zaujímavosť", "najväčšia sopka"]],
        readout: "Robotické vozidlá skúmajú Mars a hľadajú stopy, či tam kedysi mohol existovať život.",
      },
    },
  },
  {
    id: "jupiter",
    name: { de: "Jupiter", sk: "Jupiter" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 58,
    y: 56,
    w: 126,
    h: 126,
    orbit: 70,
    photo: "./assets/jupiter-cutout.webp",
    glow: "rgba(130, 228, 218, 0.62)",
    credit: "Bildquelle: NASA/ESA/CSA/STScI, Webb",
    info: {
      de: {
        intro: "Jupiter ist der größte Planet im Sonnensystem.",
        facts: [["Art", "Gasriese"], ["Monde", "mehr als 90"], ["Ein Jahr", "etwa 12 Erdjahre"], ["Besonders", "Großer Roter Fleck"]],
        readout: "Jupiter ist so groß, dass mehr als tausend Erden in ihn hineinpassen würden.",
      },
      sk: {
        intro: "Jupiter je najväčšia planéta v slnečnej sústave.",
        facts: [["Druh", "plynný obor"], ["Mesiace", "viac ako 90"], ["Jeden rok", "asi 12 pozemských rokov"], ["Zaujímavosť", "Veľká červená škvrna"]],
        readout: "Jupiter je taký veľký, že by sa doň zmestilo viac ako tisíc Zemí.",
      },
    },
  },
  {
    id: "saturn",
    name: { de: "Saturn", sk: "Saturn" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 71,
    y: 29,
    w: 202,
    h: 136,
    orbit: 84,
    photo: "./assets/saturn-cutout.webp",
    glow: "rgba(232, 214, 160, 0.72)",
    credit: "Bildquelle: NASA/ESA/STScI, Hubble",
    info: {
      de: {
        intro: "Saturn ist berühmt für seine hellen Ringe aus Eis und Gestein.",
        facts: [["Art", "Gasriese"], ["Monde", "mehr als 140"], ["Ein Jahr", "etwa 29 Erdjahre"], ["Besonders", "auffälliges Ringsystem"]],
        readout: "Saturns Ringe sehen aus wie eine Scheibe, bestehen aber aus vielen einzelnen Eis- und Gesteinsstücken.",
      },
      sk: {
        intro: "Saturn je známy svojimi jasnými prstencami z ľadu a kameňa.",
        facts: [["Druh", "plynný obor"], ["Mesiace", "viac ako 140"], ["Jeden rok", "asi 29 pozemských rokov"], ["Zaujímavosť", "výrazné prstence"]],
        readout: "Saturnove prstence vyzerajú ako disk, ale skladajú sa z mnohých kúskov ľadu a kameňa.",
      },
    },
  },
  {
    id: "uranus",
    name: { de: "Uranus", sk: "Urán" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 82,
    y: 67,
    w: 74,
    h: 74,
    orbit: 96,
    photo: "./assets/uranus-cutout.webp",
    glow: "rgba(124, 226, 232, 0.62)",
    credit: "Bildquelle: NASA/JPL-Caltech, Voyager 2",
    info: {
      de: {
        intro: "Uranus ist ein kalter Eisriese und rollt fast auf der Seite um die Sonne.",
        facts: [["Art", "Eisriese"], ["Farbe", "blaugrün"], ["Ein Jahr", "84 Erdjahre"], ["Besonders", "stark gekippt"]],
        readout: "Uranus sieht blaugrün aus, weil Methan in seiner Atmosphäre rotes Licht verschluckt.",
      },
      sk: {
        intro: "Urán je studený ľadový obor a okolo Slnka sa pohybuje takmer naboku.",
        facts: [["Druh", "ľadový obor"], ["Farba", "modrozelená"], ["Jeden rok", "84 pozemských rokov"], ["Zaujímavosť", "veľmi naklonený"]],
        readout: "Urán vyzerá modrozeleno, pretože metán v jeho atmosfére pohlcuje červené svetlo.",
      },
    },
  },
  {
    id: "neptune",
    name: { de: "Neptun", sk: "Neptún" },
    kind: { de: "Planet", sk: "Planéta" },
    x: 90,
    y: 43,
    w: 68,
    h: 68,
    orbit: 108,
    photo: "./assets/neptune-cutout.webp",
    glow: "rgba(94, 137, 255, 0.66)",
    credit: "Bildquelle: NASA/JPL-Caltech, Voyager 2",
    info: {
      de: {
        intro: "Neptun ist weit draußen im Sonnensystem und sehr windig.",
        facts: [["Art", "Eisriese"], ["Farbe", "blau"], ["Ein Jahr", "165 Erdjahre"], ["Besonders", "sehr starke Winde"]],
        readout: "Auf Neptun wehen einige der schnellsten Winde im Sonnensystem.",
      },
      sk: {
        intro: "Neptún je ďaleko vo vonkajšej časti slnečnej sústavy a fúka tam silný vietor.",
        facts: [["Druh", "ľadový obor"], ["Farba", "modrá"], ["Jeden rok", "165 pozemských rokov"], ["Zaujímavosť", "veľmi silné vetry"]],
        readout: "Na Neptúne fúkajú niektoré z najrýchlejších vetrov v slnečnej sústave.",
      },
    },
  },
  {
    id: "pluto",
    name: { de: "Pluto", sk: "Pluto" },
    kind: { de: "Zwergplanet", sk: "Trpasličia planéta" },
    x: 96,
    y: 72,
    w: 36,
    h: 36,
    orbit: 118,
    photo: "./assets/pluto-cutout.webp",
    glow: "rgba(194, 160, 125, 0.56)",
    credit: "Bildquelle: NASA/JHUAPL/SwRI, New Horizons",
    info: {
      de: {
        intro: "Pluto ist ein kleiner Zwergplanet weit hinter Neptun.",
        facts: [["Region", "Kuipergürtel"], ["Oberfläche", "Eis und Gestein"], ["Ein Jahr", "248 Erdjahre"], ["Besonders", "helle Herzform"]],
        readout: "Pluto ist kleiner als der Mond der Erde und wurde 2015 von New Horizons nah fotografiert.",
      },
      sk: {
        intro: "Pluto je malá trpasličia planéta ďaleko za Neptúnom.",
        facts: [["Oblasť", "Kuiperov pás"], ["Povrch", "ľad a horniny"], ["Jeden rok", "248 pozemských rokov"], ["Zaujímavosť", "svetlé srdce na povrchu"]],
        readout: "Pluto je menšie ako Mesiac Zeme a v roku 2015 ho zblízka odfotila sonda New Horizons.",
      },
    },
  },
];

function bilingualLabel(names) {
  return names.de === names.sk ? names.de : `${names.de} / ${names.sk}`;
}

const ORBIT_LEFT = -4;
const ORBIT_CENTER_Y = 50;
const ORBIT_MAX_RATIO = 0.85;

function fitOrbitHeight(body) {
  const a = body.orbit / 2;
  const centerX = ORBIT_LEFT + a;
  const dx = body.x - centerX;
  const root = Math.sqrt(1 - (dx / a) ** 2);
  const naturalRatio = Math.abs(body.y - ORBIT_CENTER_Y) / (a * root);
  const ratio = Math.min(naturalRatio, ORBIT_MAX_RATIO);
  return 2 * ratio * a;
}

registerServiceWorker({
  scriptUrl: "../../service-worker.js",
  scope: "../../",
});

renderSystem();

closeButton.addEventListener("click", closePanel);
panel.addEventListener("click", (event) => {
  if (event.target === panel) closePanel();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePanel();
});

function renderSystem() {
  system.innerHTML = '<div class="sun" aria-hidden="true"></div>';

  for (const body of bodies.filter((item) => item.id !== "moon")) {
    const orbit = document.createElement("span");
    orbit.className = "orbit";
    orbit.style.setProperty("--orbit-size", `${body.orbit}%`);
    orbit.style.setProperty("--orbit-height", `${fitOrbitHeight(body)}%`);
    system.append(orbit);
  }

  for (const body of bodies) {
    const button = document.createElement("button");
    button.className = "body-button";
    button.type = "button";
    button.dataset.id = body.id;
    button.setAttribute("aria-label", `${bilingualLabel(body.name)} anzeigen`);
    button.style.setProperty("--x", `${body.x}%`);
    button.style.setProperty("--y", `${body.y}%`);
    button.style.setProperty("--w", `${body.w}px`);
    button.style.setProperty("--h", `${body.h}px`);
    button.style.setProperty("--glow", body.glow);

    const image = document.createElement("img");
    image.className = "body-photo";
    image.src = body.photo;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;

    const label = document.createElement("span");
    label.className = "body-label";

    const labelDe = document.createElement("span");
    labelDe.className = "body-label-de";
    labelDe.lang = "de";
    labelDe.textContent = body.name.de;
    label.append(labelDe);

    if (body.name.sk !== body.name.de) {
      const labelSk = document.createElement("span");
      labelSk.className = "body-label-sk";
      labelSk.lang = "sk";
      labelSk.textContent = body.name.sk;
      label.append(labelSk);
    }

    button.append(image, label);
    button.addEventListener("click", () => openBody(body));
    system.append(button);
  }
}

function openBody(body) {
  if (!body) return;

  panel.classList.add("is-open");
  photo.src = body.photo;
  photo.alt = `Bild von ${bilingualLabel(body.name)}`;
  photo.style.setProperty("--glow", body.glow);
  photo.dataset.id = body.id;

  kind.textContent = `${body.kind.de} / ${body.kind.sk}`;

  name.innerHTML = "";
  const nameDe = document.createElement("span");
  nameDe.className = "name-de";
  nameDe.lang = "de";
  nameDe.textContent = body.name.de;
  name.append(nameDe);

  if (body.name.sk !== body.name.de) {
    const nameSk = document.createElement("span");
    nameSk.className = "name-sk";
    nameSk.lang = "sk";
    nameSk.textContent = body.name.sk;
    name.append(nameSk);
  }

  credit.textContent = body.credit;
  renderInfo(body);
}

function renderInfo(body) {
  info.innerHTML = "";

  for (const [languageKey, languageLabel] of languages) {
    const languageInfo = body.info[languageKey];
    const section = document.createElement("section");
    section.className = "language-card";
    section.lang = languageKey;

    const heading = document.createElement("h3");
    heading.textContent = languageLabel;

    const intro = document.createElement("p");
    intro.className = "intro";
    intro.textContent = languageInfo.intro;

    const facts = document.createElement("dl");
    facts.className = "facts";
    for (const [label, value] of languageInfo.facts) {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      item.append(term, description);
      facts.append(item);
    }

    const readout = document.createElement("p");
    readout.className = "readout";
    readout.textContent = languageInfo.readout;

    section.append(heading, intro, facts, readout);
    info.append(section);
  }
}

function closePanel() {
  panel.classList.remove("is-open");
}
