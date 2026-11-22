import test from "node:test";
import assert from "node:assert/strict";
import { episode001, completedEpisodeTurn } from "../lib/studio/episode001";

test("first episode has exactly three roles and a grounded first question", () => {
  assert.equal(episode001.id, "001");
  assert.equal(episode001.names.length, 3);
  assert.equal(episode001.styles.length, 3);
  assert.equal(episode001.roles.length, 3);
  assert.match(episode001.styles[0], /Qu'est-ce qui a changé/);
  assert.match(episode001.editorialContext, /FIN/);
});
test("FIN at end of speech is a deliberate handoff, never a mid-sentence mention", () => {
  for (const text of ["fin", "FIN.", "Voilà mon point de vue. Fin!", "Je crois que c’est la fin."])
    assert.equal(completedEpisodeTurn(text), true, text);
  for (const text of ["enfin", "finalement", "La fin de la compétition est une question", "Je dis fin mais je continue", "fin de conférence"])
    assert.equal(completedEpisodeTurn(text), false, text);
});
