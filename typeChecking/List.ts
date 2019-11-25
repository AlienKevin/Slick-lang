const declaration  = 
`map        (a → b) → List a → List b
mapIndexed  (a → Int → b) → List a → List b
filter      (a → Bool) → List a → List a
reject      (a → Bool) → List a → List a
find        (a → Bool) → List a → Maybe a
reduce      (a → b → a) → a → List b → a
reduceLast (a → b → a) → a → List b → a
all         (a → Bool) → List a → Bool
any         (a → Bool) → List a → Bool
first       List a → Maybe a
tail        List a → List a
head        List a → List a
last        List a → Maybe a
nth         Int → List a → Maybe a
take        Int → List a → List a
takeLast   Int → List a → List a
slice       Int → Int → List a → List a
member      a → List a → Bool
insert      Int → a → List a → List a
append      a → List a → List a
prepend     a → List a → List a
update      Int → a → List a → List a
drop        Int → List a → List a
dropLast   Int → List a → List a
concat      List a → List a → List a
adjust      Int → (a → a) → List a → List a
length      List a → Int
range       Int → Int → List Int
sum         List num → num`;

export default declaration;