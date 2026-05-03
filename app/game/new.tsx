import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar, { getAvatarColor, getInitials } from '../../components/Avatar';
import Checkbox from '../../components/Checkbox';
import { Colors, Fonts } from '../../constants/Colors';
import { addGameType, addPlayer, createSession, getGameTypes, getPlayers } from '../../db/database';
import { GameType, Player } from '../../db/types';

// ── ADD GAME MODAL ─────────────────────────────────────────

function AddGameModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, highestWins: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [highestWins, setHighestWins] = useState(true);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Name required'); return; }
    onSave(trimmed, highestWins);
    setName('');
    setHighestWins(true);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIcon}>
              <Feather name="grid" size={22} color={Colors.accentInk} />
            </View>
            <View>
              <Text style={styles.sheetTitle}>Add a game</Text>
              <Text style={styles.sheetSub}>Saves to your library</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Catan, Bridge…"
            placeholderTextColor={Colors.ink4}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Scoring</Text>
          <View style={styles.segmented}>
            <Pressable
              style={[styles.seg, highestWins && styles.segOn]}
              onPress={() => setHighestWins(true)}
            >
              <Text style={[styles.segLabel, highestWins && styles.segLabelOn]}>Highest wins</Text>
            </Pressable>
            <Pressable
              style={[styles.seg, !highestWins && styles.segOn]}
              onPress={() => setHighestWins(false)}
            >
              <Text style={[styles.segLabel, !highestWins && styles.segLabelOn]}>Lowest wins</Text>
            </Pressable>
          </View>

          <View style={styles.sheetActions}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostLabel}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary, { flex: 2 }]} onPress={handleSave}>
              <Text style={styles.btnPrimaryLabel}>Save game</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── ADD PLAYER MODAL ───────────────────────────────────────

function AddPlayerModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, colorIndex: number) => void;
}) {
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Name required'); return; }
    onSave(trimmed, colorIdx);
    setName('');
    setColorIdx(0);
  };

  const previewInitials = name.trim()
    ? getInitials(name.trim())
    : '?';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Avatar name={previewInitials || '?'} colorIndex={colorIdx} size="lg" />
            <View>
              <Text style={styles.sheetTitle}>Add player</Text>
              <Text style={styles.sheetSub}>They'll appear in your roster</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Name</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={16} color={Colors.ink3} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingLeft: 38 }]}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={Colors.ink4}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Color</Text>
          <View style={styles.colorRow}>
            {Colors.avatarTones.map(([bg, fg], i) => (
              <Pressable
                key={i}
                onPress={() => setColorIdx(i)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: bg },
                  i === colorIdx && styles.colorSwatchSelected,
                ]}
              >
                {i === colorIdx && (
                  <Text style={[styles.colorSwatchText, { color: fg }]}>{previewInitials}</Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.sheetActions}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostLabel}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary, { flex: 2 }]} onPress={handleSave}>
              <Text style={styles.btnPrimaryLabel}>Add to game</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── MAIN SCREEN ────────────────────────────────────────────

export default function NewGameScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [showAddGame, setShowAddGame] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getGameTypes(db), getPlayers(db)]).then(([gt, pl]) => {
        if (!active) return;
        setGameTypes(gt);
        setPlayers(pl);
        if (!selectedGame && gt.length > 0) setSelectedGame(gt[0]);
      });
      return () => { active = false; };
    }, [db])
  );

  const togglePlayer = (id: number) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddGame = async (name: string, highestWins: boolean) => {
    try {
      const id = await addGameType(db, name, highestWins);
      const updated = await getGameTypes(db);
      setGameTypes(updated);
      const newGame = updated.find(g => g.id === id) ?? null;
      setSelectedGame(newGame);
      setShowAddGame(false);
    } catch {
      Alert.alert('A game with that name already exists.');
    }
  };

  const handleAddPlayer = async (name: string, colorIndex: number) => {
    try {
      const id = await addPlayer(db, name, colorIndex);
      const updated = await getPlayers(db);
      setPlayers(updated);
      setSelectedPlayerIds(prev => new Set([...prev, id]));
      setShowAddPlayer(false);
    } catch {
      Alert.alert('A player with that name already exists.');
    }
  };

  const handleStart = async () => {
    if (!selectedGame) { Alert.alert('Pick a game first'); return; }
    if (selectedPlayerIds.size < 2) { Alert.alert('Select at least 2 players'); return; }
    setStarting(true);
    try {
      const chosen = players.filter(p => selectedPlayerIds.has(p.id));
      const id = await createSession(
        db,
        selectedGame.id,
        selectedGame.name,
        selectedGame.highest_wins === 1,
        chosen.map(p => ({ id: p.id, name: p.name, color_index: p.color_index }))
      );
      router.replace(`/game/${id}`);
    } finally {
      setStarting(false);
    }
  };

  // Split players into recent (has last_played_at) and all-time-only
  const recent = players.filter(p => p.last_played_at !== null);
  const neverPlayed = players.filter(p => p.last_played_at === null);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="x" size={18} color={Colors.ink} />
        </Pressable>
        <View style={styles.titleStack}>
          <Text style={styles.eyebrow}>Setup</Text>
          <Text style={styles.pageTitle}>New game</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Game picker */}
        <Text style={styles.sectionLabel}>Game</Text>
        <View style={styles.sectionPad}>
          {selectedGame && (
            <View style={styles.gamePicker}>
              <View style={styles.gameIcon}>
                <Feather name="grid" size={20} color={Colors.accentInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gamePickerName}>{selectedGame.name}</Text>
                <Text style={styles.gamePickerMeta}>
                  {selectedGame.highest_wins ? 'Highest wins' : 'Lowest wins'}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={Colors.ink3} />
            </View>
          )}

          <View style={styles.gameChips}>
            {gameTypes.map(g => (
              <Pressable
                key={g.id}
                style={[styles.chip, selectedGame?.id === g.id && styles.chipSelected]}
                onPress={() => setSelectedGame(g)}
              >
                <Text style={[styles.chipLabel, selectedGame?.id === g.id && styles.chipLabelSelected]}>
                  {g.name}
                </Text>
              </Pressable>
            ))}
            <Pressable style={[styles.chip, styles.chipDashed]} onPress={() => setShowAddGame(true)}>
              <Feather name="plus" size={12} color={Colors.ink3} />
              <Text style={styles.chipLabel}>new game</Text>
            </Pressable>
          </View>
        </View>

        {/* Players — recent */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Players · {selectedPlayerIds.size} selected</Text>
          <Text style={styles.sectionNote}>most recent first</Text>
        </View>

        <View style={[styles.card, styles.sectionPad]}>
          {recent.map((p) => (
            <Pressable key={p.id} style={styles.playerRow} onPress={() => togglePlayer(p.id)}>
              <Avatar name={p.name} colorIndex={p.color_index} />
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{p.name}</Text>
                {p.last_played_at && (
                  <Text style={styles.playerMeta}>
                    Last played · {new Date(p.last_played_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                )}
              </View>
              <View style={styles.recentBadge}>
                <Text style={styles.recentBadgeText}>recent</Text>
              </View>
              <Checkbox checked={selectedPlayerIds.has(p.id)} />
            </Pressable>
          ))}
          {recent.length === 0 && neverPlayed.length === 0 && (
            <Text style={[styles.playerMeta, { padding: 14 }]}>No players yet — add one below</Text>
          )}
        </View>

        {/* Players — all */}
        {neverPlayed.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>All players</Text>
            <View style={[styles.card, styles.sectionPad]}>
              {neverPlayed.map((p) => (
                <Pressable key={p.id} style={styles.playerRow} onPress={() => togglePlayer(p.id)}>
                  <Avatar name={p.name} colorIndex={p.color_index} />
                  <Text style={[styles.playerName, { flex: 1 }]}>{p.name}</Text>
                  <Checkbox checked={selectedPlayerIds.has(p.id)} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Add player */}
        <View style={styles.sectionPad}>
          <Pressable style={styles.addPlayerRow} onPress={() => setShowAddPlayer(true)}>
            <View style={styles.addPlayerIcon}>
              <Feather name="plus" size={16} color={Colors.ink3} />
            </View>
            <Text style={styles.addPlayerLabel}>Add new player…</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.btn, styles.btnPrimary, styles.btnFull, starting && styles.btnDisabled]}
          onPress={handleStart}
          disabled={starting}
        >
          <Feather name="play" size={14} color={Colors.paper} />
          <Text style={styles.btnPrimaryLabel}>
            Start · {selectedPlayerIds.size} {selectedPlayerIds.size === 1 ? 'player' : 'players'}
          </Text>
        </Pressable>
      </View>

      <AddGameModal
        visible={showAddGame}
        onClose={() => setShowAddGame(false)}
        onSave={handleAddGame}
      />
      <AddPlayerModal
        visible={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        onSave={handleAddPlayer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleStack: { flex: 1 },
  eyebrow: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.ink3, letterSpacing: 0.04 },
  pageTitle: { fontFamily: Fonts.bold, fontSize: 19, color: Colors.ink, letterSpacing: -0.4 },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.ink3,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 18,
  },
  sectionNote: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.ink3,
    paddingTop: 16,
  },
  sectionPad: { paddingHorizontal: 14 },
  gamePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  gameIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamePickerName: { fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.ink },
  gamePickerMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.ink3, marginTop: 2 },
  gameChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  chipSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipDashed: { borderStyle: 'dashed', backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.ink2 },
  chipLabelSelected: { color: Colors.paper },
  card: { },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  playerName: { fontFamily: Fonts.medium, fontSize: 15, color: Colors.ink },
  playerMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.ink3, marginTop: 1 },
  recentBadge: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recentBadgeText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.accentInk },
  addPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  addPlayerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlayerLabel: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.ink2 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    paddingTop: 0,
    backgroundColor: Colors.paper,
  },
  btn: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: Colors.paper,
  },
  btnFull: { width: '100%' },
  btnPrimary: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnPrimaryLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.paper },
  btnGhostLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.ink2 },
  btnDisabled: { opacity: 0.5 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.line2,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.ink, letterSpacing: -0.4 },
  sheetSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.ink3 },
  fieldLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.ink3,
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: Colors.paper,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 999,
    padding: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  segOn: {
    backgroundColor: Colors.paper,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.ink2 },
  segLabelOn: { color: Colors.ink },
  sheetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  colorSwatchText: { fontFamily: Fonts.semiBold, fontSize: 10 },
});
