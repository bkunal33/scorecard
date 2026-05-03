import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import NumberPad from '../../components/NumberPad';
import { Colors, Fonts } from '../../constants/Colors';
import { endSession, getSessionDetail, upsertScore } from '../../db/database';
import { Score, Session, SessionPlayer } from '../../db/types';

const COL_MIN = 60;
const COL_ROUND = 40;

interface EditingCell {
  roundNumber: number;
  playerIdx: number;
}

function calcTotals(players: SessionPlayer[], scores: Score[]): number[] {
  return players.map(p =>
    scores
      .filter(s => s.player_id === p.player_id && !s.is_skipped && s.value !== null)
      .reduce((sum, s) => sum + (s.value ?? 0), 0)
  );
}

function getCurrentRound(players: SessionPlayer[], scores: Score[]): number {
  if (players.length === 0) return 1;
  if (scores.length === 0) return 1;
  const maxRound = Math.max(...scores.map(s => s.round_number));
  for (let r = 1; r <= maxRound; r++) {
    const hasAll = players.every(p =>
      scores.some(s => s.round_number === r && s.player_id === p.player_id)
    );
    if (!hasAll) return r;
  }
  return maxRound + 1;
}

function getScoreForCell(scores: Score[], playerId: number, round: number): Score | undefined {
  return scores.find(s => s.player_id === playerId && s.round_number === round);
}

function formatScore(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

export default function ScoringScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [loading, setLoading] = useState(true);

  const totalsScrollRef = useRef<ScrollView>(null);
  const gridScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessionDetail(db, sessionId).then(({ session: s, players: pl, scores: sc }) => {
        if (!active) return;
        setSession(s);
        setPlayers(pl);
        setScores(sc);
        setLoading(false);
      });
      return () => { active = false; };
    }, [db, sessionId])
  );

  if (loading || !session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.ink3, fontFamily: Fonts.regular }}>Loading…</Text>
      </View>
    );
  }

  const currentRound = getCurrentRound(players, scores);
  const totals = calcTotals(players, scores);
  const leadIdx = session.highest_wins
    ? totals.indexOf(Math.max(...totals))
    : totals.indexOf(Math.min(...totals));
  const allRounds = Array.from({ length: currentRound }, (_, i) => i + 1);

  // Column width based on player count
  const colWidth = Math.max(COL_MIN, Math.floor((340 - COL_ROUND) / Math.min(players.length, 4)));

  const openCell = (roundNumber: number, playerIdx: number) => {
    setEditingCell({ roundNumber, playerIdx });
  };

  const handleSave = async (value: number | null, isSkipped: boolean) => {
    if (!editingCell) return;
    const { roundNumber, playerIdx } = editingCell;
    const player = players[playerIdx];

    await upsertScore(db, sessionId, player.player_id, roundNumber, value, isSkipped);

    // Refresh scores
    const { scores: newScores } = await getSessionDetail(db, sessionId);
    setScores(newScores);

    // Advance to next player
    const nextPlayerIdx = playerIdx + 1;
    if (nextPlayerIdx < players.length) {
      setEditingCell({ roundNumber, playerIdx: nextPlayerIdx });
    } else {
      // Move to next round first player
      const nextRound = roundNumber + 1;
      setEditingCell({ roundNumber: nextRound, playerIdx: 0 });
    }
  };

  const handlePrev = () => {
    if (!editingCell) return;
    const { roundNumber, playerIdx } = editingCell;
    if (playerIdx > 0) {
      setEditingCell({ roundNumber, playerIdx: playerIdx - 1 });
    } else if (roundNumber > 1) {
      setEditingCell({ roundNumber: roundNumber - 1, playerIdx: players.length - 1 });
    }
  };

  const handleEndGame = () => {
    Alert.alert(
      'End game?',
      'This will finalize the scores and show the results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End game',
          onPress: async () => {
            await endSession(db, sessionId);
            router.replace(`/end/${sessionId}`);
          },
        },
      ]
    );
  };

  const onGridHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    totalsScrollRef.current?.scrollTo({
      x: e.nativeEvent.contentOffset.x,
      animated: false,
    });
  };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={18} color={Colors.ink} />
        </Pressable>
        <View style={styles.titleStack}>
          <Text style={styles.eyebrow}>
            Round {currentRound} · in progress
          </Text>
          <Text style={styles.pageTitle}>{session.game_name}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={handleEndGame}>
          <Feather name="flag" size={16} color={Colors.ink} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() =>
          Alert.alert('More', '', [
            { text: 'End game', onPress: handleEndGame },
            { text: 'Cancel', style: 'cancel' },
          ])
        }>
          <Feather name="more-horizontal" size={16} color={Colors.ink} />
        </Pressable>
      </View>

      {/* Table */}
      <View style={styles.tableContainer}>
        {/* Fixed left column */}
        <View style={styles.leftCol}>
          {/* Corner */}
          <View style={[styles.totalCorner, { height: 74 }]}>
            <Text style={styles.totalCornerLabel}>TOTAL</Text>
          </View>
          {/* Round labels */}
          <ScrollView style={{ flex: 1 }} scrollEnabled={false} nestedScrollEnabled>
            {allRounds.map(r => (
              <View
                key={r}
                style={[
                  styles.roundCell,
                  r === currentRound && styles.roundCellCurrent,
                ]}
              >
                <Text style={[styles.roundLabel, r === currentRound && styles.roundLabelCurrent]}>
                  {r}
                </Text>
              </View>
            ))}
            {/* Next round hint */}
            <View style={[styles.roundCell, { borderBottomWidth: 0, opacity: 0.3 }]}>
              <Text style={styles.roundLabel}>+</Text>
            </View>
          </ScrollView>
        </View>

        {/* Scrollable right area */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {/* Totals bar */}
          <ScrollView
            ref={totalsScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={styles.totalsBar}
          >
            {players.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.totalCell,
                  { width: colWidth },
                  i === leadIdx && styles.totalCellLead,
                ]}
              >
                {i === leadIdx && <View style={styles.leadBar} />}
                <Text style={[styles.totalName]} numberOfLines={1}>{p.player_name}</Text>
                <Text style={[styles.totalValue, i === leadIdx && styles.totalValueLead]}>
                  {totals[i] % 1 === 0 ? totals[i] : totals[i].toFixed(1)}
                </Text>
                <Text style={styles.totalDelta}>
                  {i === leadIdx
                    ? '↑ leading'
                    : totals.every(t => t === 0) ? ''
                    : `−${Math.abs(totals[leadIdx] - totals[i]).toFixed(totals[leadIdx] % 1 !== 0 ? 1 : 0)}`}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Score grid */}
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled>
            <ScrollView
              ref={gridScrollRef}
              horizontal
              onScroll={onGridHScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
            >
              <View>
                {allRounds.map(r => (
                  <View key={r} style={styles.scoreRow}>
                    {players.map((p, i) => {
                      const sc = getScoreForCell(scores, p.player_id, r);
                      const isEditing =
                        editingCell?.roundNumber === r && editingCell?.playerIdx === i;
                      const isCurrent = r === currentRound;

                      if (sc?.is_skipped) {
                        return (
                          <Pressable
                            key={p.id}
                            style={[styles.scoreCell, { width: colWidth }, styles.scoreCellSkip]}
                            onPress={() => openCell(r, i)}
                          >
                            <Text style={styles.skipText}>—</Text>
                          </Pressable>
                        );
                      }

                      if (sc !== undefined) {
                        // Has a score
                        return (
                          <Pressable
                            key={p.id}
                            style={[
                              styles.scoreCell,
                              { width: colWidth },
                              isEditing && styles.scoreCellEditing,
                            ]}
                            onPress={() => openCell(r, i)}
                          >
                            <Text style={[styles.scoreCellText, sc.value !== null && sc.value < 0 && styles.negText]}>
                              {sc.value !== null ? formatScore(sc.value) : ''}
                            </Text>
                          </Pressable>
                        );
                      }

                      // Empty cell
                      return (
                        <Pressable
                          key={p.id}
                          style={[
                            styles.scoreCell,
                            { width: colWidth },
                            isCurrent && styles.scoreCellCurrentRound,
                            isEditing && styles.scoreCellEditing,
                          ]}
                          onPress={() => openCell(r, i)}
                        >
                          {isEditing ? (
                            <Text style={styles.scoreCellEditingDot}>·</Text>
                          ) : (
                            <Text style={styles.tapHint}>{isCurrent ? 'tap' : ''}</Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                {/* Next round hint row */}
                <View style={styles.scoreRow}>
                  {players.map(p => (
                    <View key={p.id} style={[styles.scoreCell, { width: colWidth, borderBottomWidth: 0, opacity: 0.3 }]}>
                      <Text style={styles.tapHint}>·</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>

      {/* Number pad */}
      {editingCell && (
        <NumberPad
          isOpen={!!editingCell}
          playerName={players[editingCell.playerIdx]?.player_name ?? ''}
          colorIndex={players[editingCell.playerIdx]?.color_index ?? 0}
          roundNumber={editingCell.roundNumber}
          initialValue={
            getScoreForCell(scores, players[editingCell.playerIdx]?.player_id, editingCell.roundNumber)?.value
          }
          isInitiallySkipped={
            getScoreForCell(scores, players[editingCell.playerIdx]?.player_id, editingCell.roundNumber)?.is_skipped === 1
          }
          onClose={() => setEditingCell(null)}
          onSave={handleSave}
          onPrev={handlePrev}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: Colors.paper,
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
  eyebrow: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.ink3 },
  pageTitle: { fontFamily: Fonts.bold, fontSize: 19, color: Colors.ink, letterSpacing: -0.4 },

  tableContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftCol: {
    width: COL_ROUND,
    backgroundColor: Colors.paper2,
    borderRightWidth: 1,
    borderRightColor: Colors.line,
  },
  totalCorner: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  totalCornerLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  roundCell: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  roundCellCurrent: {
    backgroundColor: Colors.accentSoft,
  },
  roundLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.ink3,
  },
  roundLabelCurrent: {
    color: Colors.accentInk,
    fontFamily: Fonts.semiBold,
  },

  totalsBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: Colors.paper2,
    maxHeight: 74,
  },
  totalCell: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.line,
  },
  totalCellLead: {
    backgroundColor: Colors.successSoft,
  },
  leadBar: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: Colors.success,
    borderRadius: 3,
    alignSelf: 'center',
  },
  totalName: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.ink2,
    letterSpacing: 0.02,
  },
  totalValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 20,
    color: Colors.ink,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  totalValueLead: {
    color: Colors.successInk,
  },
  totalDelta: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink3,
    marginTop: 1,
    height: 12,
  },

  scoreRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  scoreCell: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.line,
    backgroundColor: Colors.paper,
  },
  scoreCellSkip: {
    backgroundColor: Colors.paper2,
  },
  scoreCellCurrentRound: {
    backgroundColor: Colors.paper2,
  },
  scoreCellEditing: {
    backgroundColor: Colors.accentSoft,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 4,
    zIndex: 2,
  },
  scoreCellText: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.ink,
  },
  scoreCellEditingDot: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.ink4,
  },
  negText: {
    color: Colors.negative,
  },
  skipText: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.ink4,
  },
  tapHint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.ink4,
  },
});
