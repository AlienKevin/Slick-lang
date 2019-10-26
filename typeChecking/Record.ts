const declaration =
`
prop=         Text → {} → Maybe a
pick=         List Text → {} → {}
has=          Text → {} → Bool
path=         List Text → Maybe a
keys=         {} → List Text
assoc=        Text → a → {} → {}
assoc·path=   List Text → a → {} → {}
dissoc=       Text → a → {} → {}
dissoc·path=  List Text → a → {} → {}
omit=         Text → {} → {}
merge=        {} → {} → {}
merge·last=   {} → {} → {}
`;
// TODO: evolve
export default declaration;