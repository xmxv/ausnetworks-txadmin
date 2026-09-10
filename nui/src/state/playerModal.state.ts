import {
  atom,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";

export enum PlayerModalTabs {
  ACTIONS,
  INFO,
  IDENTIFIERS,
  HISTORY,
  BAN,
  //AusNetworks: economy, vehicles, inventory and trust. Appended rather than
  //inserted so the numeric values of the upstream tabs do not shift.
  AUSNET,
}

const playerModalTabAtom = atom<PlayerModalTabs>({
  key: "playerModalTab",
  default: PlayerModalTabs.ACTIONS,
});

export const usePlayerModalTabValue = () => useRecoilValue(playerModalTabAtom);
export const useSetPlayerModalTab = () => useSetRecoilState(playerModalTabAtom);
export const usePlayerModalTab = () => useRecoilState(playerModalTabAtom);

const modalVisibilityAtom = atom({
  key: "playerModalVisibility",
  default: false,
});

export const usePlayerModalVisbilityValue = () =>
  useRecoilValue(modalVisibilityAtom);
export const usePlayerModalVisibility = () =>
  useRecoilState(modalVisibilityAtom);
export const useSetPlayerModalVisibility = () =>
  useSetRecoilState(modalVisibilityAtom);
