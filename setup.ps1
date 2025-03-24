# Maak de benodigde mappen aan
New-Item -ItemType Directory -Force -Path "public"
New-Item -ItemType Directory -Force -Path "src"

# Kopieer de bestanden naar de juiste locaties
Copy-Item "logo.jpeg" -Destination "public/"
Copy-Item "Locaties_Werchter.xlsx" -Destination "public/"
Copy-Item "enkel video" -Destination "public/" -Recurse 