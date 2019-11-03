const declaration =
`lower      Text → Text
upper       Text → Text
lower?      Text → Bool
upper?      Text → Bool
nth         Num → Text → Maybe Text
take        Num → Text → Text
takeLast   Num → Text → Text
trim        Text → Text
split       Text → Text → List Text
capitalize  Text → Text
endsWith   Text → Text → Bool
startsWith Text → Text → Bool
slice       Num → Num → Text → Text
member      Text → Text → Bool
length      Text → Num
char        Num → Maybe Text`;

export default declaration;
