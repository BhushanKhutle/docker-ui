import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Stepper, Step, StepLabel,
  Autocomplete, TextField, Checkbox, FormControlLabel, Chip, Alert,
  LinearProgress, Paper, Divider, Grid, CircularProgress,
} from '@mui/material';
import { CompareArrows, ArrowForward, CheckCircle, Error, PlayArrow } from '@mui/icons-material';
import { imagesApi, nodesApi, transfersApi } from '../api/index';
import { Image, Node, ImageLocation, NodeRef } from '../types/index';
import EnvBadge from '../components/layout/EnvBadge';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'error';
}

export default function Transfer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preloadImageId = searchParams.get('image_id');

  const [images, setImages] = useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [locations, setLocations] = useState<ImageLocation | null>(null);
  const [selectedSource, setSelectedSource] = useState<NodeRef | null>(null);
  const [selectedDests, setSelectedDests] = useState<Set<string>>(new Set());
  const [transferring, setTransferring] = useState(false);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [transferIds, setTransferIds] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    imagesApi.list().then(r => {
      setImages(r.data);
      if (preloadImageId) {
        const found = r.data.find((img: Image) => img.id === preloadImageId);
        if (found) selectImage(found);
      }
    });
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const selectImage = async (img: Image | null) => {
    setSelectedImage(img);
    setSelectedSource(null);
    setSelectedDests(new Set());
    setLocations(null);
    if (img) {
      setLoadingLocations(true);
      try {
        const r = await imagesApi.getLocations(img.id);
        setLocations(r.data);
        // Auto-select first available source
        if (r.data.present_nodes?.length > 0) {
          setSelectedSource(r.data.present_nodes[0]);
        }
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const toggleDest = (nodeId: string) => {
    setSelectedDests(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleTransfer = async () => {
    if (!selectedImage || !selectedSource || selectedDests.size === 0) return;
    setTransferring(true);
    setStep(2);
    setLogs([{ text: `Initiating transfer of ${selectedImage.full_name}...`, type: 'info' }]);

    try {
      const r = await transfersApi.initiate({
        image_id: selectedImage.id,
        source_node_id: selectedSource.node_id,
        destination_node_ids: Array.from(selectedDests),
      });
      setTransferIds(r.data.transfer_ids);
      setLogs(l => [...l, { text: `Transfer jobs created: ${r.data.transfer_ids.length} destination(s)`, type: 'info' }]);

      // Poll for status updates
      const ids: string[] = r.data.transfer_ids;
      let completed = 0;

      const poll = setInterval(async () => {
        for (const id of ids) {
          try {
            const tr = await transfersApi.get(id);
            const t = tr.data;
            if (t.status === 'success') {
              setLogs(l => [...l, { text: `✓ Transfer to ${t.destination_node_name} completed in ${t.duration_seconds}s`, type: 'success' }]);
              completed++;
            } else if (t.status === 'failed') {
              setLogs(l => [...l, { text: `✗ Transfer to ${t.destination_node_name} failed: ${t.error_message}`, type: 'error' }]);
              completed++;
            }
          } catch {}
        }
        if (completed >= ids.length) {
          clearInterval(poll);
          setTransferring(false);
          setLogs(l => [...l, { text: `All transfers completed.`, type: 'info' }]);
          toast.success('Transfers completed');
        }
      }, 3000);
    } catch (err: any) {
      setLogs(l => [...l, { text: `Error: ${err.response?.data?.error || err.message}`, type: 'error' }]);
      setTransferring(false);
      toast.error('Transfer initiation failed');
    }
  };

  const canTransfer = selectedImage && selectedSource && selectedDests.size > 0 && !transferring;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Transfer Image</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Manually push container images between clusters and nodes
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', color: '#94A3B8', '& .MuiAlert-icon': { color: '#00D4FF' } }}>
        Transfers are <strong>always manual</strong>. No automatic synchronization occurs. Select source and destination nodes explicitly.
      </Alert>

      <Grid container spacing={2}>
        {/* Left: Configuration */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
                Step 1 — Select Image
              </Typography>
              <Autocomplete
                options={images}
                getOptionLabel={o => o.full_name}
                value={selectedImage}
                onChange={(_, v) => selectImage(v)}
                renderInput={params => (
                  <TextField {...params} placeholder="Search and select image..." size="small" />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                        {option.full_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                        {option.environments?.map(e => <EnvBadge key={e} env={e} />)}
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          · {option.node_count} node(s)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            </CardContent>
          </Card>

          {selectedImage && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
                    Step 2 — Select Source Node
                  </Typography>
                  {loadingLocations ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} sx={{ color: '#00D4FF' }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Fetching node locations...</Typography>
                    </Box>
                  ) : locations?.present_nodes?.length === 0 ? (
                    <Alert severity="warning">This image is not available on any registered node.</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {locations?.present_nodes?.map(n => (
                        <Box
                          key={n.node_id}
                          onClick={() => setSelectedSource(n)}
                          sx={{
                            p: 1.5, borderRadius: 1.5, cursor: 'pointer',
                            border: `1px solid ${selectedSource?.node_id === n.node_id ? 'rgba(0,212,255,0.4)' : 'rgba(148,163,184,0.1)'}`,
                            background: selectedSource?.node_id === n.node_id ? 'rgba(0,212,255,0.06)' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            transition: 'all 0.15s',
                          }}
                        >
                          <Box sx={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: selectedSource?.node_id === n.node_id ? '#00D4FF' : '#10B981',
                            boxShadow: selectedSource?.node_id === n.node_id ? '0 0 8px rgba(0,212,255,0.6)' : 'none',
                          }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.node_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.cluster_name}</Typography>
                          </Box>
                          <EnvBadge env={n.environment} />
                          <Chip label={n.node_type} size="small" sx={{ fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace', background: 'rgba(148,163,184,0.05)' }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
                    Step 3 — Select Destination Nodes
                    {selectedDests.size > 0 && (
                      <Chip label={`${selectedDests.size} selected`} size="small" sx={{ ml: 1, height: 18, fontSize: '0.62rem', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }} />
                    )}
                  </Typography>

                  {/* Nodes with image (still allowed to transfer to re-sync) */}
                  {locations?.present_nodes && locations.present_nodes.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#10B981', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                        Already has image
                      </Typography>
                      {locations.present_nodes.filter(n => n.node_id !== selectedSource?.node_id).map(n => (
                        <FormControlLabel
                          key={n.node_id}
                          control={<Checkbox checked={selectedDests.has(n.node_id)} onChange={() => toggleDest(n.node_id)} size="small" sx={{ color: '#10B981', '&.Mui-checked': { color: '#10B981' } }} />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: '0.85rem' }}>{n.node_name}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.cluster_name}</Typography>
                              <EnvBadge env={n.environment} />
                            </Box>
                          }
                          sx={{ display: 'flex', mb: 0.5, ml: 0 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Nodes missing the image */}
                  <Box>
                    <Typography variant="caption" sx={{ color: '#F87171', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                      Missing image
                    </Typography>
                    {locations?.missing_nodes?.length === 0 ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>All nodes already have this image.</Typography>
                    ) : locations?.missing_nodes?.map(n => (
                      <FormControlLabel
                        key={n.node_id}
                        control={<Checkbox checked={selectedDests.has(n.node_id)} onChange={() => toggleDest(n.node_id)} size="small" sx={{ color: '#00D4FF', '&.Mui-checked': { color: '#00D4FF' } }} />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '0.85rem' }}>{n.node_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.cluster_name}</Typography>
                            <EnvBadge env={n.environment} />
                          </Box>
                        }
                        sx={{ display: 'flex', mb: 0.5, ml: 0 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </>
          )}
        </Grid>

        {/* Right: Summary + Execute */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ position: 'sticky', top: 16 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 2 }}>
                Transfer Summary
              </Typography>

              {!selectedImage ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <CompareArrows sx={{ fontSize: 40, color: 'rgba(148,163,184,0.2)', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Select an image to get started</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ p: 2, background: 'rgba(0,212,255,0.05)', borderRadius: 1.5, border: '1px solid rgba(0,212,255,0.15)', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontSize: '0.65rem' }}>Image</Typography>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem', color: '#00D4FF', wordBreak: 'break-all' }}>
                      {selectedImage.full_name}
                    </Typography>
                  </Box>

                  {selectedSource && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 1 }}>Route</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ p: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 1 }}>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{selectedSource.node_name}</Typography>
                          <EnvBadge env={selectedSource.environment} />
                        </Box>
                        <ArrowForward sx={{ color: '#00D4FF', fontSize: 18 }} />
                        <Box>
                          {selectedDests.size === 0 ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>No destinations selected</Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {Array.from(selectedDests).map(nodeId => {
                                const allNodes = [...(locations?.present_nodes || []), ...(locations?.missing_nodes || [])];
                                const n = allNodes.find(x => x.node_id === nodeId);
                                return n ? (
                                  <Box key={nodeId} sx={{ p: 0.75, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 1 }}>
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{n.node_name}</Typography>
                                    <EnvBadge env={n.environment} />
                                  </Box>
                                ) : null;
                              })}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  <Button
                    fullWidth variant="contained" size="large"
                    startIcon={transferring ? <CircularProgress size={18} sx={{ color: '#060B18' }} /> : <PlayArrow />}
                    onClick={handleTransfer}
                    disabled={!canTransfer}
                    sx={{ mb: 2, py: 1.5, fontSize: '0.9rem' }}
                  >
                    {transferring ? 'Transferring...' : `Transfer to ${selectedDests.size} Node${selectedDests.size !== 1 ? 's' : ''}`}
                  </Button>

                  {/* Logs */}
                  {logs.length > 0 && (
                    <>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 1 }}>
                        Transfer Log
                      </Typography>
                      <Paper sx={{ background: '#060B18', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 1.5, p: 1.5, maxHeight: 280, overflow: 'auto' }}>
                        {logs.map((log, i) => (
                          <Typography
                            key={i}
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.72rem',
                              lineHeight: 1.8,
                              color: log.type === 'success' ? '#10B981' : log.type === 'error' ? '#EF4444' : '#94A3B8',
                            }}
                          >
                            <span style={{ color: '#475569' }}>[{new Date().toLocaleTimeString()}]</span> {log.text}
                          </Typography>
                        ))}
                        <div ref={logsEndRef} />
                      </Paper>
                      {!transferring && logs.length > 0 && (
                        <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/history')}>
                          View transfer history →
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
