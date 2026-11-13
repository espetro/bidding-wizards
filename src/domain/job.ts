/** Who and where the bid is for. Printed on the bid and saved with the draft. */
export type JobInfo = { name: string; address: string; date: string };

export function emptyJob(): JobInfo {
  return { name: "", address: "", date: new Date().toISOString().slice(0, 10) };
}
