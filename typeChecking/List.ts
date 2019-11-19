const declaration  = 
`map        (a → b) → List a → List b
mapIndexed  (a → Num → b) → List a → List b
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
nth         Num → List a → Maybe a
take        Num → List a → List a
takeLast   Num → List a → List a
slice       Num → Num → List a → List a
member      a → List a → Bool
insert      Num → a → List a → List a
append      a → List a → List a
prepend     a → List a → List a
update      Num → a → List a → List a
drop        Num → List a → List a
dropLast   Num → List a → List a
concat      List a → List a → List a
adjust      Num → (a → a) → List a → List a
length      List a → Num
range       Num → Num → List Num`;

export default declaration;