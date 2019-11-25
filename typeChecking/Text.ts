const declaration =
`lower      Text → Text
upper       Text → Text
lower?      Text → Bool
upper?      Text → Bool
nth         Int → Text → Maybe Text
take        Int → Text → Text
takeLast    Int → Text → Text
trim        Text → Text
split       Text → Text → List Text
capitalize  Text → Text
endsWith    Text → Text → Bool
startsWith  Text → Text → Bool
slice       Int → Int → Text → Text
member      Text → Text → Bool
length      Text → Int
char        Int → Maybe Text
join        Text → List Text → Text`;

export default declaration;
