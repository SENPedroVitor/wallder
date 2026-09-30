/** Visual studies for the remaining members of the 18-agent roster. */
export type AdditionalCharacter =
  | 'songbird' | 'rorschach' | 'homer' | 'c3po' | 'batman' | 'reed'
  | 'ultron' | 'captain' | 'marilia' | 'hal' | 'tony'

export const additionalAgentNames: Record<AdditionalCharacter, string> = {
  songbird: 'Songbird', rorschach: 'Rorschach', homer: 'Homer',
  c3po: 'C-3PO', batman: 'Batman', reed: 'Reed Richards',
  ultron: 'Ultron', captain: 'Capitão América', marilia: 'Marília',
  hal: 'Hal Jordan', tony: 'Tony Stark',
}

export default function AdditionalBody({ agent, accessory }: { agent: AdditionalCharacter; accessory: boolean }) {
  switch (agent) {
    case 'songbird': return <>
      <path className="mascot__body" d="M24 35q0-18 24-18t29 20v31q0 18-27 18T23 69Z" />
      {accessory && <><path className="mascot__hair" d="M18 60V34c0-18 13-26 31-26 22 0 32 11 32 31v25l-9-7V35q-11-1-17-10-9 13-26 13v28Z" /><path className="mascot__cyber" d="M75 45h7v18h-7Z" /><path className="mascot__cyber-line" d="M79 62v11h-8" /></>}
    </>
    case 'rorschach': return <>
      <path className="mascot__body" d="M50 13c19 0 31 13 31 34v16c0 17-13 26-31 26S19 80 19 63V47c0-21 12-34 31-34Z" />
      {accessory && <g className="mascot__mask-ink">
        <path d="M48 29c-4-7-9-7-12-2-6-2-10 2-8 8-6 4-6 10-1 13-3 6-1 12 5 12 2 6 9 8 12 2l-1-9 4-7-3-8Z" />
        <path transform="translate(100 0) scale(-1 1)" d="M48 29c-4-7-9-7-12-2-6-2-10 2-8 8-6 4-6 10-1 13-3 6-1 12 5 12 2 6 9 8 12 2l-1-9 4-7-3-8Z" />
      </g>}
    </>
    case 'homer': return <>
      <path className="mascot__body" d="M42 16c18-4 34 8 38 29 5 26-6 42-28 44-21 2-37-8-39-29-2-20 9-40 29-44Z" />
      {accessory && <path className="mascot__homer-hair" d="M33 20q-4-15 4-15t9 13M46 17q-1-12 5-12t8 14" />}
    </>
    case 'c3po': return <>
      <path className="mascot__body" d="M30 15h40l13 17v39L70 85H30L17 71V32Z" />
      {accessory && <><path className="mascot__accent" d="M30 15h40l9 12H21Z" /><path className="mascot__seam" d="M21 32h58" /></>}
    </>
    case 'batman': return <path className="mascot__body" d="M20 12 36 29q14-5 28 0l16-17v45q0 28-30 28T20 57Z" />
    case 'reed': return <>
      <path className="mascot__body" d="M30 12c21-9 45 2 48 21 2 13-1 27-10 40-8 11-25 16-40 9-12-5-18-17-14-31 3-12 7-34 16-39Z" />
      {accessory && <g className="mascot__fantastic-badge"><circle cx="49" cy="27" r="9" /><path d="m50 21-6 8h10m-4-8v13" /></g>}
    </>
    case 'ultron': return <>
      <path className="mascot__body" d="M26 20q24-13 48 0l7 19v31q0 16-31 16T19 70V39Z" />
      {accessory && <><path className="mascot__accent" d="M26 20q24-13 48 0l3 10q-27-10-54 0Z" /><path className="mascot__red-detail" d="M25 39v13m50-13v13M35 24l5 3m25-3-5 3" /></>}
    </>
    case 'captain': return <>
      <path className="mascot__body" d="M50 11c24 0 39 17 39 39S74 89 50 89 11 72 11 50s15-39 39-39Z" />
      {accessory && <><path className="mascot__accent" d="M32 16q18-9 36 0l-3 13q-15-6-30 0ZM22 71q28 22 56 0l-8 12q-20 11-40 0Z" /><path className="mascot__detail" d="M20 40q-5 11 0 22m60-22q5 11 0 22" /></>}
    </>
    case 'marilia': return <>
      <path className="mascot__body" d="M50 15c18 0 30 14 30 34v28c0 6-5 10-11 10H31c-6 0-11-4-11-10V49c0-20 12-34 30-34Z" />
      {accessory && <><path className="mascot__accent" d="M39 15 50 5l11 10-5 8H44Z" /><path className="mascot__detail" d="M24 31 14 25m62 6 10-6" /></>}
    </>
    case 'hal': return <>
      <path className="mascot__body" d="M28 12h44l15 18-12 21 12 22-15 15H28L13 73l12-22-12-21Z" />
      {accessory && <><path className="mascot__accent" d="M20 25q30-22 60 0l-9 9q-21-15-42 0ZM29 72q21 15 42 0l9 9q-30 18-60 0Z" /></>}
    </>
    case 'tony': return <>
      <path className="mascot__body" d="M30 14h40l15 18-4 42-15 13H34L19 74l-4-42Z" />
      {accessory && <><path className="mascot__accent" d="M30 14h40l15 18-13 4-8-11H36l-8 11-13-4ZM25 72l12 5h26l12-5-9 15H34Z" /><path className="mascot__seam" d="M21 39 28 35m51 4-7-4" /></>}
    </>
  }
}
