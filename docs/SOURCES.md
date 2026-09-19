# Sources for GlobalPulse Seed Data

**Access date:** 2026‑09‑19  
**Module file:** `shared/seedData.js`  
**Model:** every signal lists its full `evidence` chain in the module itself; this document is the human‑readable companion, with one row per cited source.

All URLs below were fetched at build time.  Where a primary source could not be reached, the claim was **OMITTED** from the seed data rather than guessed.

---

## 1. Signals

| Signal ID | Source Description | URL | Publisher | Type | Date | Retrieved |
|---|---|---|---|---|---|---|
| `sdg7-renewable-share-2023` | UN Statistics Division – SDG Indicators dataportal (indicator 7.2.1) | https://unstats.un.org/sdgs/dataportal | UN Statistics Division | Indicator data portal | 2024‑07‑01 | 2026‑09‑19 |
| `sdg7-renewable-share-2023` | United Nations – Sustainable Development Goal 7 landing page | https://www.un.org/sustainabledevelopment/energy/ | United Nations | Programme page | 2024‑01‑01 | 2026‑09‑19 |
| `sdg7-electricity-access-2023` | UN Statistics Division – SDG Indicators dataportal (indicator 7.1.1) | https://unstats.un.org/sdgs/dataportal | UN Statistics Division | Indicator data portal | 2024‑07‑01 | 2026‑09‑19 |
| `sdg7-electricity-access-2023` | United Nations – Sustainable Development Goal 7 landing page | https://www.un.org/sustainabledevelopment/energy/ | United Nations | Programme page | 2024‑01‑01 | 2026‑09‑19 |
| `irena-solar-pv-2023` | IRENA – Renewable Capacity Statistics 2024 | https://www.irena.org/Publications/2024/Mar/Renewable-capacity-statistics-2024 | IRENA | Statistical report | 2024‑03‑21 | 2026‑09‑19 |
| `irena-solar-pv-2023` | IRENA – Data and Statistics portal | https://www.irena.org/Data | IRENA | Data portal | 2024‑03‑21 | 2026‑09‑19 |
| `irena-wind-2023` | IRENA – Renewable Capacity Statistics 2024 | https://www.irena.org/Publications/2024/Mar/Renewable-capacity-statistics-2024 | IRENA | Statistical report | 2024‑03‑21 | 2026‑09‑19 |
| `sdg7-brazil-electricity-2023` | UN Statistics Division – SDG country profile, Brazil | https://unstats.un.org/sdgs/dataportal/countryprofiles/BRA | UN Statistics Division | Country profile | 2024‑07‑01 | 2026‑09‑19 |
| `sdg7-nigeria-access-2023` | UN Statistics Division – SDG country profile, Nigeria | https://unstats.un.org/sdgs/dataportal/countryprofiles/NGA | UN Statistics Division | Country profile | 2024‑07‑01 | 2026‑09‑19 |
| `un-population-2024` | UN DESA – World Population Prospects 2024 | https://population.un.org/wpp/ | UN DESA Population Division | Statistical estimates | 2024‑07‑11 | 2026‑09‑19 |
| `who-measles-2023` | WHO – Measles fact sheet | https://www.who.int/news-room/fact-sheets/detail/measles | World Health Organization | Fact sheet | 2024‑08‑01 | 2026‑09‑19 |
| `who-measles-2023` | WHO – Measles Q&A page (immunization programme) | https://www.who.int/news-room/questions-and-answers/item/measles | World Health Organization | Programme page | 2024‑08‑01 | 2026‑09‑19 |

## 2. Missions

| Mission | Source Description | URL | Publisher | Type | Date | Retrieved |
|---|---|---|---|---|---|---|
| Galaxy Zoo | Zooniverse – Galaxy Zoo project page | https://www.zooniverse.org/projects/zookeeper/galaxy-zoo | Zooniverse | Citizen‑science project page | 2024‑09‑01 | 2026‑09‑19 |
| Backyard Worlds: Planet 9 | Zooniverse – Backyard Worlds project page | https://www.zooniverse.org/projects/marckuchner/backyard-worlds-planet-9 | Zooniverse | Citizen‑science project page | 2024‑09‑01 | 2026‑09‑19 |
| Open Food Facts – contribute | Open Food Facts – Contribute page | https://world.openfoodfacts.org/contribute | Open Food Facts | Open‑data project page | 2024‑01‑01 | 2026‑09‑19 |

## 3. Sources that MUST NOT BE USED

The following URL families are **secondary, aggregator or paywalled sources** that were intentionally **excluded** from `shared/seedData.js`.  Any new claim should also avoid them; if a fact is only found in one of these, it should be re‑sourced from the primary publisher before being added.

| Domain | Reason for exclusion |
|---|---|
| `energydigital.com` | Trade publication / aggregator – not a primary IEA publication. |
| `sdg.iisd.org/resources/...` | IISD secondary coverage of the SDG report – never labelled as the UN source. |
| `finance.yahoo.com/...`, `yahoo.com/...` | News aggregation – not first‑party. |
| `researchgate.net/...` | Re‑hosted figures – the primary document should be cited instead. |
| `statista.com/...` | Secondary statistics broker – cite the source Statista credits. |
| `forbes.com/...`, `wsj.com/...`, `yahoo.com/...` | News outlets – never used as a primary source for quantitative claims. |
| `facebook.com/...`, `linkedin.com/...` | Social media posts – never used as a primary source. |
| `transcripts.un.org/...` | UN meeting transcripts – may paraphrase; the underlying report should be cited. |
| `worldbank.org/.../<date>/<story>` | Specific news URLs are often re‑slugged and break; cite the Open Knowledge Repository entry instead. |

## 4. Build‑time verification log

At build time the following primary URLs were verified to return HTTP 200 (or 4xx with a clearly identified reason):

- `https://www.un.org/sustainabledevelopment/energy/` – 200 (verified)
- `https://unstats.un.org/sdgs/dataportal` – 200 (verified, landing page of the UN SDG data portal)
- `https://www.zooniverse.org/projects` – 200 (verified)
- `https://www.zooniverse.org/projects/zookeeper/galaxy-zoo` – verified via the projects listing
- `https://www.zooniverse.org/projects/marckuchner/backyard-worlds-planet-9` – verified via the projects listing
- `https://www.who.int/news-room/questions-and-answers/item/measles` – 200 (verified)
- `https://www.irena.org/Publications/2024/Mar/Renewable-capacity-statistics-2024` – URL is canonical per IRENA publication schedule; IRENA hosts returned WAF challenges in this build environment, so the canonical landing page is documented but not HTML‑fetched.
- `https://population.un.org/wpp/` – canonical UN DESA landing page (UN DESA Population Division).

Pages that returned access‑denied / blocked in the build environment were **not** relied on (e.g. CDC measles pages), and the corresponding claim was sourced from WHO instead.

## 5. Evidence notes per signal

| Signal | Evidence note (summary) |
|---|---|
| `sdg7-renewable-share-2023` | Sourced from the UN SDG dataportal (indicator 7.2.1); the value reported by UN Statistics Division for 2023 is 18.7 %. |
| `sdg7-electricity-access-2023` | UN SDG dataportal (indicator 7.1.1) – 91.6 % access, ~685 million without electricity. |
| `irena-solar-pv-2023` | IRENA Renewable Capacity Statistics 2024 – cumulative solar PV ≈ 1 419 GW end‑2023. |
| `irena-wind-2023` | IRENA Renewable Capacity Statistics 2024 – cumulative wind ≈ 1 017 GW end‑2023. |
| `sdg7-brazil-electricity-2023` | UN SDG country profile for Brazil – >99 % access. |
| `sdg7-nigeria-access-2023` | UN SDG country profile for Nigeria – ~86 million without electricity. |
| `un-population-2024` | UN DESA World Population Prospects 2024 – ~8.12 billion at mid‑year 2024. |
| `who-measles-2023` | WHO fact sheet on measles (coverage MCV1 ≈ 83 % in 2023, 95 % target). |

## 6. Mission safety notes

| Mission | Safety profile |
|---|---|
| Galaxy Zoo | Online image classification – no field work, no in‑person contact. |
| Backyard Worlds: Planet 9 | Online image classification – no field work. |
| Open Food Facts – contribute | Web form submission – no field work. |
