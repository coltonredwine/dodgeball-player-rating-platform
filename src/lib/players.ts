export function playerIdFromNames(firstName: string, lastName: string) {
  return `${firstName.trim().toLowerCase()}-${lastName.trim().toLowerCase()}`;
}
