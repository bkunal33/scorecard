import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { getSessions, deleteSession } from '../db/database';
import { SessionSummary } from '../db/types';
import { Colors, Fonts } from '../constants/Colors';

type Filter = 'all' | 'live' | 'recent';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessions(db).then(data => {
        if (active) { setSessions(data); setLoading(false); }
      });
      return () => { active = false; };
    }, [db])
  );

  const filtered = sessions.filter(s => {
    if (filter === 'live') return s.status === 'active';
    if (filter === 'recent') return s.status === 'complete';
    return true;
  });

  const handleDelete = (id: number) => {
    Alert.alert('Delete game?', 'This will permanently remove all scores.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(db, id);
          setSessions(prev => prev.filter(s => s.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={styles.title}>Scorecard</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        <View style={styles.segmented}>
          {(['all', 'live', 'recent'] as Filter[]).map(f => (
            <Pressable key={f} style={[styles.seg, filter === f && styles.segOn]} onPress={() => setFilter(f)}>
              <Text style={[styles.segLabel, filter === f && styles.segLabelOn]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="clipboard" size={40} color={Colors.ink4} />
          <Text style={styles.emptyText}>No games yet</Text>
          <Text style={styles.emptySubtext}>Tap + to start your first game</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map(s => (
            <Pressable
              key={s.id}
              style={styles.card}
              onPress={() =>
                router.push(
                  s.status === 'active'
                    ? `/game/${s.id}`
                    : `/end/${s.id}`
                )
              }
              onLongPress={() => handleDelete(s.id)}
            >
              {/* Card top row */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{s.game_name}</Text>
                    {s.status === 'active' && (
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveText}>● Live</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta}>
                    {formatDate(s.started_at)}
                    {s.round_count > 0 && ` · ${s.round_count} round${s.round_count !== 1 ? 's' : ''}`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={Colors.ink4} />
              </View>

              {/* Card bottom row */}
              <View style={styles.cardBottom}>
                <View style={styles.avatarStack}>
                  {s.players.slice(0, 4).map((p, j) => (
                    <View key={j} style={[styles.avatarWrap, { marginLeft: j === 0 ? 0 : -8 }]}>
                      <Avatar name={p.name} colorIndex={p.color_index} size="sm" />
                    </View>
                  ))}
                  {s.players.length > 4 && (
                    <View style={[styles.avatarWrap, { marginLeft: -8 }]}>
                      <View style={styles.avatarOverflow}>
                        <Text style={styles.avatarOverflowText}>+{s.players.length - 4}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {s.leader_name && (
                  <View style={styles.leader}>
                    <Feather name="award" size={13} color={Colors.ink3} />
                    <Text style={styles.leaderName}>{s.leader_name}</Text>
                    {s.leader_score !== null && (
                      <Text style={styles.leaderScore}>{s.leader_score}</Text>
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 22 }]}
        onPress={() => router.push('/game/new')}
      >
        <Feather name="plus" size={22} color={Colors.paper} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  eyebrow: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.ink3,
    letterSpacing: 0.04,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  filterRow: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 999,
    padding: 3,
    alignSelf: 'flex-start',
  },
  seg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  segOn: {
    backgroundColor: Colors.paper,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.ink2,
  },
  segLabelOn: {
    color: Colors.ink,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.ink2,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.ink3,
  },
  card: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  liveBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: 'white',
  },
  cardMeta: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.ink3,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderWidth: 2,
    borderColor: Colors.paper,
    borderRadius: 999,
  },
  avatarOverflow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.paper3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverflowText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.ink2,
  },
  leader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  leaderScore: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.ink3,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
});
