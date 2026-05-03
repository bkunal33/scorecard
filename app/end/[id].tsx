import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import { Colors, Fonts } from '../../constants/Colors';
import { createSession, getSessionDetail } from '../../db/database';
import { Score, Session, SessionPlayer } from '../../db/types';

interface Standing {
  player: SessionPlayer;
  total: number;
  roundCount: number;
  bestRound: number | null;
}

function buildStandings(players: SessionPlayer[], scores: Score[], highestWins: boolean): Standing[] {
  return players
    .map(p => {
      const ps = scores.filter(s => s.player_id === p.player_id && !s.is_skipped && s.value !== null);
      const total = ps.reduce((sum, s) => sum + (s.value ?? 0), 0);
      const values = ps.map(s => s.value as number);
      const bestRound = values.length
        ? highestWins ? Math.max(...values) : Math.min(...values)
        : null;
      return { player: p, total, roundCount: ps.length, bestRound };
    })
    .sort((a, b) => highestWins ? b.total - a.total : a.total - b.total);
}

function formatScore(v: number): string {
  if (v % 1 !== 0) return v.toFixed(1);
  return String(v);
}

export default function EndGameScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const [session, setSession] = useState<Session | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessionDetail(db, sessionId).then(({ session: s, players: pl, scores: sc }) => {
        if (!active) return;
        setSession(s);
        setPlayers(pl);
        setScores(sc);
        setStandings(buildStandings(pl, sc, s ? s.highest_wins === 1 : true));
        setLoading(false);
      });
      return () => { active = false; };
    }, [db, sessionId])
  );

  const handleRematch = async () => {
    if (!session) return;
    const id = await createSession(
      db,
      session.game_type_id,
      session.game_name,
      session.highest_wins === 1,
      players.map(p => ({ id: p.player_id, name: p.player_name, color_index: p.color_index }))
    );
    router.replace(`/game/${id}`);
  };

  if (loading || !session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: Fonts.regular, color: Colors.ink3 }}>Loading…</Text>
      </View>
    );
  }

  const winner = standings[0];
  const maxRound = scores.length > 0 ? Math.max(...scores.map(s => s.round_number)) : 0;
  const margin =
    standings.length >= 2
      ? Math.abs(standings[0].total - standings[1].total)
      : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.replace('/')}>
          <Feather name="x" size={18} color={Colors.ink} />
        </Pressable>
        <View style={styles.titleStack}>
          <Text style={styles.eyebrow}>{session.game_name}</Text>
          <Text style={styles.pageTitle}>Game complete</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Winner card */}
        {winner && (
          <View style={styles.winnerCard}>
            <Feather name="award" size={32} color={Colors.accentInk} />
            <Text style={styles.winnerName}>{winner.player.player_name} wins!</Text>
            {margin !== null && margin > 0 && (
              <Text style={styles.winnerMeta}>
                by {formatScore(margin)} point{margin !== 1 ? 's' : ''} · {maxRound} round{maxRound !== 1 ? 's' : ''} played
              </Text>
            )}
            <View style={{ marginTop: 12 }}>
              <Avatar name={winner.player.player_name} colorIndex={winner.player.color_index} size="lg" />
            </View>
          </View>
        )}

        {/* Final standings */}
        <Text style={styles.sectionLabel}>Final standings</Text>
        <View style={styles.card}>
          {standings.map((s, i) => (
            <View key={s.player.id} style={styles.standingRow}>
              <Text style={[styles.rank, i === 0 && styles.rankFirst]}>{i + 1}</Text>
              <Avatar name={s.player.player_name} colorIndex={s.player.color_index} />
              <View style={{ flex: 1 }}>
                <Text style={styles.standingName}>{s.player.player_name}</Text>
                <Text style={styles.standingMeta}>
                  {s.bestRound !== null
                    ? `best round ${s.bestRound > 0 ? '+' : ''}${formatScore(s.bestRound)} · `
                    : ''}
                  {s.roundCount} round{s.roundCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.standingTotal}>{formatScore(s.total)}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable style={styles.btn} onPress={handleRematch}>
            <Feather name="refresh-cw" size={14} color={Colors.ink} />
            <Text style={styles.btnLabel}>Rematch</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => router.replace('/')}>
            <Text style={styles.btnPrimaryLabel}>Back to home</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={[styles.btn, styles.btnPrimary, { flex: 1 }]} onPress={() => router.replace('/')}>
          <Text style={styles.btnPrimaryLabel}>Back to home</Text>
        </Pressable>
      </View>
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
    paddingVertical: 10,
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
  eyebrow: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.ink3 },
  pageTitle: { fontFamily: Fonts.bold, fontSize: 19, color: Colors.ink, letterSpacing: -0.4 },

  winnerCard: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  winnerName: {
    fontFamily: Fonts.caveat,
    fontSize: 32,
    color: Colors.accentInk,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  winnerMeta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.accentInk,
    opacity: 0.7,
    marginTop: 4,
  },

  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.ink3,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    paddingVertical: 8,
  },
  card: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  rank: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: Colors.ink3,
    width: 22,
    textAlign: 'center',
  },
  rankFirst: { color: Colors.accent },
  standingName: { fontFamily: Fonts.medium, fontSize: 15, color: Colors.ink },
  standingMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.ink3, marginTop: 1 },
  standingTotal: {
    fontFamily: Fonts.monoMedium,
    fontSize: 20,
    color: Colors.ink,
    letterSpacing: -0.5,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 70,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.paper,
  },
  btnPrimary: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  btnLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.ink },
  btnPrimaryLabel: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.paper },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    backgroundColor: Colors.paper,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
});
