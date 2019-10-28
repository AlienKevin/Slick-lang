const declaration =
`lower      Text → Text
upper       Text → Text
lower?      Text → Bool
upper?      Text → Bool
nth         Num → Text → Maybe Text
take        Num → Text → Text
take·last   Num → Text → Text
trim        Text → Text
split       Text → Text → List Text
capitalize  Text → Text
ends·with   Text → Text → Bool
starts·with Text → Text → Bool
slice       Num → Num → Text → Text
member      Text → Text → Bool
length      Text → Num`;

export default declaration;
