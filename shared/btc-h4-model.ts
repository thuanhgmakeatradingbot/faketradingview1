import { CandleData } from './types';

// ────────────────────────────────────────────────────────────────────────────
// BTC H4 RR1 decision-tree model — ported 1:1 from the Pine v6 indicator
// "PB OKX BTC H4 RR1 Optimized". Curve-fitted on the latest 5,000 OKX
// BTC-USDT-SWAP H4 bars (in-sample 94.76% winrate). Forward-test before trading.
//
// Indicators reproduce Pine semantics:
//   ta.ema  → standard EMA seeded with the first value
//   ta.atr  → RMA (Wilder) of True Range
//   ta.rsi  → 100 - 100/(1+rs), rs = rma(gain)/rma(loss)
// ────────────────────────────────────────────────────────────────────────────

const MINTICK = 0.1; // OKX BTC-USDT-SWAP tick size (syminfo.mintick)

/** Standard EMA. ema[0] = data[0], then ema = k*src + (1-k)*ema[-1]. */
export function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    out.push(data[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

/** Wilder's RMA. Seeded with SMA of the first `period` values, then rma = (prev*(p-1)+src)/p. */
export function rma(data: number[], period: number): number[] {
  const out: number[] = new Array(data.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i < period - 1) {
      out[i] = sum / (i + 1); // partial average before the seed (only used during warmup)
    } else if (i === period - 1) {
      out[i] = sum / period; // SMA seed
    } else {
      out[i] = (out[i - 1] * (period - 1) + data[i]) / period;
    }
  }
  return out;
}

/** True Range series. */
function trueRange(candles: CandleData[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const h = candles[i].high;
      const l = candles[i].low;
      const pc = candles[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
  }
  return tr;
}

/** ta.atr(period) = rma(TrueRange, period). */
export function atr(candles: CandleData[], period: number): number[] {
  return rma(trueRange(candles), period);
}

/** ta.rsi(close, period). */
export function rsi(closes: number[], period: number): number[] {
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(Math.max(change, 0));
    losses.push(Math.max(-change, 0));
  }
  const avgGain = rma(gains, period);
  const avgLoss = rma(losses, period);
  return closes.map((_, i) => {
    const g = avgGain[i];
    const l = avgLoss[i];
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  });
}

/** Highest of arr over the `n` bars ending at index `end` (inclusive). */
function highestAt(arr: number[], n: number, end: number): number {
  let m = -Infinity;
  for (let i = end; i > end - n && i >= 0; i--) m = Math.max(m, arr[i]);
  return m;
}

/** Lowest of arr over the `n` bars ending at index `end` (inclusive). */
function lowestAt(arr: number[], n: number, end: number): number {
  let m = Infinity;
  for (let i = end; i > end - n && i >= 0; i--) m = Math.min(m, arr[i]);
  return m;
}

export interface Features {
  ret_1: number; ret_2: number; ret_3: number; ret_5: number;
  ret_8: number; ret_13: number; ret_21: number; ret_34: number;
  dist_ema_21: number; slope_ema_21: number;
  dist_ema_34: number; slope_ema_34: number;
  dist_ema_55: number; slope_ema_55: number;
  dist_ema_89: number; slope_ema_89: number;
  dist_ema_200: number; slope_ema_200: number;
  rsi_14: number;
  body_atr: number; range_atr: number; close_position: number;
  body_lag_1: number; body_lag_2: number; body_lag_3: number; body_lag_5: number;
  below_high_3: number; above_low_3: number;
  below_high_5: number; above_low_5: number;
  below_high_8: number; above_low_8: number;
  below_high_13: number; above_low_13: number;
  below_high_21: number; above_low_21: number;
}

/** Minimum bars needed for stable EMA200 + lag[34] + slope[5] features. */
export const MIN_BARS = 210;

/**
 * Compute the Pine feature vector at the last (current, confirmed) bar of `candles`.
 * Returns null if there is not enough history.
 */
export function computeFeatures(candles: CandleData[]): Features | null {
  const n = candles.length;
  if (n < MIN_BARS) return null;

  const i = n - 1;
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);

  const atr14 = atr(candles, 14);
  const ema21 = ema(close, 21);
  const ema34 = ema(close, 34);
  const ema55 = ema(close, 55);
  const ema89 = ema(close, 89);
  const ema200 = ema(close, 200);
  const rsi14 = rsi(close, 14);

  const a = atr14[i];
  if (!isFinite(a) || a === 0) return null;

  const c = candles[i];
  const bodyAtrAt = (idx: number) => (candles[idx].close - candles[idx].open) / atr14[idx];

  return {
    ret_1: (close[i] - close[i - 1]) / a,
    ret_2: (close[i] - close[i - 2]) / a,
    ret_3: (close[i] - close[i - 3]) / a,
    ret_5: (close[i] - close[i - 5]) / a,
    ret_8: (close[i] - close[i - 8]) / a,
    ret_13: (close[i] - close[i - 13]) / a,
    ret_21: (close[i] - close[i - 21]) / a,
    ret_34: (close[i] - close[i - 34]) / a,
    dist_ema_21: (close[i] - ema21[i]) / a,
    slope_ema_21: (ema21[i] - ema21[i - 5]) / a,
    dist_ema_34: (close[i] - ema34[i]) / a,
    slope_ema_34: (ema34[i] - ema34[i - 5]) / a,
    dist_ema_55: (close[i] - ema55[i]) / a,
    slope_ema_55: (ema55[i] - ema55[i - 5]) / a,
    dist_ema_89: (close[i] - ema89[i]) / a,
    slope_ema_89: (ema89[i] - ema89[i - 5]) / a,
    dist_ema_200: (close[i] - ema200[i]) / a,
    slope_ema_200: (ema200[i] - ema200[i - 5]) / a,
    rsi_14: rsi14[i],
    body_atr: (c.close - c.open) / a,
    range_atr: (c.high - c.low) / a,
    close_position: (c.close - c.low) / Math.max(c.high - c.low, MINTICK),
    body_lag_1: bodyAtrAt(i - 1),
    body_lag_2: bodyAtrAt(i - 2),
    body_lag_3: bodyAtrAt(i - 3),
    body_lag_5: bodyAtrAt(i - 5),
    // below_high_N = (close - highest(high, N)[1]) / atr  → window ends at bar i-1
    below_high_3: (close[i] - highestAt(high, 3, i - 1)) / a,
    above_low_3: (close[i] - lowestAt(low, 3, i - 1)) / a,
    below_high_5: (close[i] - highestAt(high, 5, i - 1)) / a,
    above_low_5: (close[i] - lowestAt(low, 5, i - 1)) / a,
    below_high_8: (close[i] - highestAt(high, 8, i - 1)) / a,
    above_low_8: (close[i] - lowestAt(low, 8, i - 1)) / a,
    below_high_13: (close[i] - highestAt(high, 13, i - 1)) / a,
    above_low_13: (close[i] - lowestAt(low, 13, i - 1)) / a,
    below_high_21: (close[i] - highestAt(high, 21, i - 1)) / a,
    above_low_21: (close[i] - lowestAt(low, 21, i - 1)) / a,
  };
}

/**
 * Long probability [0, 1] — direct 1:1 port of Pine `long_probability_calc()`.
 * Keep the branch order and constants identical to the source.
 */
export function longProbability(f: Features): number {
  if (f.dist_ema_21 <= -0.2890394134) {
    if (f.below_high_21 <= -2.3161731455) {
      if (f.dist_ema_21 <= -0.7843153747) {
        if (f.slope_ema_89 <= -0.1837340286) {
          if (f.close_position <= 0.6470860356) {
            if (f.close_position <= 0.1895286552) {
              if (f.dist_ema_200 <= -6.0568869354) {
                if (f.slope_ema_21 <= -0.2538480833) {
                  if (f.body_lag_2 <= -0.2974297938) {
                    if (f.ret_34 <= -6.4871111317) return 0.0;
                    else return 0.5;
                  } else {
                    if (f.ret_8 <= -0.9150941074) return 0.0;
                    else return 0.2;
                  }
                } else return 1.0;
              } else {
                if (f.rsi_14 <= 25.6393592011) {
                  if (f.ret_1 <= -1.3647420398) return 1.0;
                  else return 0.8;
                } else {
                  if (f.body_lag_2 <= -0.4877632630) {
                    if (f.ret_21 <= -4.5196651695) return 0.5;
                    else return 0.07692308;
                  } else {
                    if (f.dist_ema_21 <= -0.8626608959) return 0.56716418;
                    else return 0.125;
                  }
                }
              }
            } else {
              if (f.above_low_5 <= 0.9882858171) {
                if (f.ret_1 <= -0.3009062894) {
                  if (f.body_lag_3 <= 0.1697032154) {
                    if (f.ret_8 <= -0.2114539785) return 0.65909091;
                    else return 0.2;
                  } else {
                    if (f.below_high_13 <= -2.4258328841) return 0.15;
                    else return 1.0;
                  }
                } else {
                  if (f.ret_2 <= -0.0127096936) {
                    if (f.ret_8 <= -3.0840842220) return 0.33333333;
                    else return 0.88311688;
                  } else {
                    if (f.slope_ema_200 <= -0.1101997414) return 0.81818182;
                    else return 0.26666667;
                  }
                }
              } else {
                if (f.below_high_3 <= -0.9394700262) {
                  if (f.body_lag_2 <= -0.8429871601) {
                    if (f.ret_8 <= -1.8267617879) return 0.57142857;
                    else return 0.0;
                  } else {
                    if (f.ret_8 <= -0.7820884671) return 1.0;
                    else return 0.66666667;
                  }
                } else {
                  if (f.above_low_3 <= 1.7801059266) {
                    if (f.below_high_21 <= -4.5496381208) return 0.06896552;
                    else return 0.48275862;
                  } else {
                    if (f.below_high_3 <= -0.4694224855) return 0.33333333;
                    else return 1.0;
                  }
                }
              }
            }
          } else {
            if (f.ret_2 <= 0.6506710412) {
              if (f.range_atr <= 1.3140634967) {
                if (f.above_low_3 <= 1.3453108853) {
                  if (f.above_low_5 <= 0.7977886818) {
                    if (f.above_low_5 <= 0.3247060224) return 0.0;
                    else return 0.6;
                  } else {
                    if (f.ret_21 <= -4.4250100456) return 0.53846154;
                    else return 0.1875;
                  }
                } else {
                  if (f.ret_34 <= -3.7972160590) return 0.42857143;
                  else return 1.0;
                }
              } else {
                if (f.close_position <= 0.8717365544) {
                  if (f.ret_8 <= -3.5281590452) return 0.2;
                  else return 0.0;
                } else {
                  if (f.close_position <= 0.9397774564) return 0.75;
                  else return 0.0;
                }
              }
            } else {
              if (f.ret_34 <= -2.8717490468) {
                if (f.body_lag_3 <= 0.0261942987) {
                  if (f.body_lag_1 <= 0.5071858173) return 1.0;
                  else return 0.44444444;
                } else {
                  if (f.ret_34 <= -4.1003401313) return 0.0;
                  else return 0.5;
                }
              } else return 1.0;
            }
          }
        } else {
          if (f.dist_ema_200 <= 1.0210430699) {
            if (f.below_high_5 <= -1.4932742959) {
              if (f.dist_ema_89 <= -1.5984305082) {
                if (f.above_low_3 <= 0.7219900118) {
                  if (f.dist_ema_55 <= -1.7236924046) {
                    if (f.below_high_21 <= -5.7842153520) return 1.0;
                    else return 0.30909091;
                  } else {
                    if (f.dist_ema_200 <= -2.3683072652) return 0.75862069;
                    else return 0.33333333;
                  }
                } else return 0.0;
              } else {
                if (f.below_high_8 <= -3.0506915427) {
                  if (f.ret_13 <= -0.7785627884) {
                    if (f.ret_2 <= -1.6016622921) return 0.0;
                    else return 0.375;
                  } else return 1.0;
                } else {
                  if (f.ret_8 <= -0.5297204631) {
                    if (f.dist_ema_89 <= -1.4881273783) return 0.28571429;
                    else return 0.03703704;
                  } else return 0.42857143;
                }
              }
            } else {
              if (f.dist_ema_89 <= -0.5414133053) {
                if (f.body_lag_3 <= 0.6868913380) {
                  if (f.slope_ema_200 <= -0.1712642946) return 0.0;
                  else {
                    if (f.slope_ema_200 <= 0.0366287723) return 0.6;
                    else return 0.0;
                  }
                } else return 1.0;
              } else {
                if (f.ret_1 <= -0.2373342423) return 0.8;
                else return 1.0;
              }
            }
          } else {
            if (f.body_lag_5 <= 0.0880835567) {
              if (f.ret_21 <= -1.8536078285) {
                if (f.ret_8 <= -1.2499595344) {
                  if (f.body_lag_1 <= -0.3193064587) {
                    if (f.close_position <= 0.4004762174) return 1.0;
                    else return 0.33333333;
                  } else {
                    if (f.body_lag_1 <= 0.5945493725) return 0.09090909;
                    else return 0.66666667;
                  }
                } else {
                  if (f.above_low_13 <= 0.8731398753) {
                    if (f.above_low_5 <= 0.2538130475) return 1.0;
                    else return 0.16666667;
                  } else return 1.0;
                }
              } else {
                if (f.below_high_21 <= -3.8751841733) return 1.0;
                else {
                  if (f.body_lag_1 <= -0.1503739241) {
                    if (f.ret_1 <= -1.0100732167) return 0.33333333;
                    else return 0.9047619;
                  } else {
                    if (f.dist_ema_21 <= -1.0713432042) return 0.83333333;
                    else return 0.25;
                  }
                }
              }
            } else {
              if (f.ret_8 <= -1.6120795432) {
                if (f.above_low_5 <= 0.3641711723) {
                  if (f.slope_ema_89 <= 0.2741125194) {
                    if (f.ret_5 <= -1.9908469862) return 1.0;
                    else return 0.57142857;
                  } else return 0.2;
                } else {
                  if (f.range_atr <= 0.6442369563) return 0.6;
                  else {
                    if (f.ret_1 <= -0.1336459670) return 0.2;
                    else return 0.0;
                  }
                }
              } else {
                if (f.ret_8 <= -0.7062471155) {
                  if (f.dist_ema_89 <= -0.4502345428) return 0.5;
                  else return 0.0;
                } else {
                  if (f.ret_1 <= -0.6145385567) return 0.16666667;
                  else return 0.83333333;
                }
              }
            }
          }
        }
      } else {
        if (f.dist_ema_55 <= -0.0304496099) {
          if (f.ret_34 <= -4.6094885543) {
            if (f.ret_5 <= -0.0556918194) return 0.0;
            else {
              if (f.slope_ema_21 <= -0.3713130287) {
                if (f.above_low_3 <= 1.2227813863) return 0.77777778;
                else return 0.125;
              } else return 0.0;
            }
          } else {
            if (f.below_high_13 <= -2.5825692257) {
              if (f.dist_ema_89 <= -0.7862868986) {
                if (f.below_high_8 <= -2.5136894050) {
                  if (f.ret_21 <= 0.4784205751) {
                    if (f.ret_3 <= 0.2380364374) return 0.9;
                    else return 0.4;
                  } else {
                    if (f.ret_8 <= -1.8966588855) return 0.8;
                    else return 0.0;
                  }
                } else {
                  if (f.slope_ema_21 <= -0.5354153423) {
                    if (f.dist_ema_55 <= -1.9112365690) return 0.2;
                    else return 1.0;
                  } else {
                    if (f.slope_ema_200 <= -0.1825649767) return 0.0;
                    else return 0.29411765;
                  }
                }
              } else {
                if (f.dist_ema_34 <= -0.6907380884) return 0.55555556;
                else {
                  if (f.range_atr <= 0.9508126187) return 0.0;
                  else {
                    if (f.body_lag_3 <= -0.3568966569) return 0.6;
                    else return 0.0;
                  }
                }
              }
            } else {
              if (f.ret_1 <= -0.0762428495) {
                if (f.below_high_5 <= -1.0220412776) {
                  if (f.below_high_3 <= -2.0067793439) return 0.33333333;
                  else {
                    if (f.ret_1 <= -0.6805873415) return 0.63636364;
                    else return 1.0;
                  }
                } else {
                  if (f.body_lag_2 <= -0.2355514801) return 0.0;
                  else {
                    if (f.below_high_3 <= -0.4532917976) return 0.4516129;
                    else return 0.875;
                  }
                }
              } else {
                if (f.ret_2 <= 0.6114990966) {
                  if (f.above_low_21 <= 1.1780415354) {
                    if (f.ret_13 <= -0.0306673383) return 0.2;
                    else return 0.71428571;
                  } else {
                    if (f.above_low_21 <= 1.4027447227) return 0.81818182;
                    else return 0.45098039;
                  }
                } else {
                  if (f.ret_13 <= -0.7474580445) {
                    if (f.ret_1 <= 0.1868331355) return 0.2;
                    else return 0.0;
                  } else {
                    if (f.above_low_8 <= 1.5729426091) return 0.0;
                    else return 1.0;
                  }
                }
              }
            }
          }
        } else {
          if (f.above_low_21 <= 0.9360145091) {
            if (f.ret_8 <= -0.7424626454) {
              if (f.dist_ema_34 <= -0.2668443749) return 0.375;
              else {
                if (f.ret_1 <= -0.2708197500) return 0.8;
                else return 1.0;
              }
            } else {
              if (f.ret_8 <= -0.0239559717) return 0.0;
              else return 0.4;
            }
          } else {
            if (f.ret_2 <= -0.9663426582) {
              if (f.body_lag_5 <= -0.0988874961) return 0.125;
              else return 0.85714286;
            } else {
              if (f.body_lag_2 <= -0.6396418365) {
                if (f.ret_5 <= -1.3989068185) return 0.0;
                else return 0.57142857;
              } else {
                if (f.ret_1 <= -0.1365872558) return 0.125;
                else return 0.0;
              }
            }
          }
        }
      }
    } else {
      if (f.slope_ema_55 <= -0.2993098412) {
        if (f.slope_ema_34 <= -0.3923407499) {
          if (f.slope_ema_34 <= -0.4903936187) return 0.0;
          else {
            if (f.dist_ema_89 <= -2.1863414209) return 1.0;
            else return 0.42857143;
          }
        } else {
          if (f.above_low_8 <= 1.1261028130) {
            if (f.slope_ema_34 <= -0.2612066265) return 0.0;
            else return 0.5;
          } else return 0.71428571;
        }
      } else {
        if (f.ret_13 <= -0.0307916094) {
          if (f.ret_5 <= -1.2456806028) {
            if (f.ret_2 <= -0.8354782640) {
              if (f.ret_3 <= -1.3656530232) return 0.8;
              else return 0.16666667;
            } else {
              if (f.ret_1 <= -0.3015152326) return 0.8;
              else return 1.0;
            }
          } else {
            if (f.below_high_13 <= -1.6207311465) {
              if (f.dist_ema_89 <= 1.0991998707) {
                if (f.body_lag_2 <= -0.3127963922) return 0.88888889;
                else {
                  if (f.below_high_13 <= -1.9559538338) {
                    if (f.close_position <= 0.2650568268) return 1.0;
                    else return 0.45454545;
                  } else {
                    if (f.dist_ema_21 <= -0.3962022673) return 0.0;
                    else return 0.4;
                  }
                }
              } else {
                if (f.ret_1 <= -0.8031446822) return 0.2;
                else return 0.0;
              }
            } else {
              if (f.dist_ema_21 <= -0.4085541475) return 1.0;
              else return 0.6;
            }
          }
        } else {
          if (f.above_low_3 <= -0.1131898842) return 0.5;
          else {
            if (f.ret_2 <= 0.0735007063) return 1.0;
            else return 0.71428571;
          }
        }
      }
    }
  } else {
    if (f.slope_ema_55 <= 0.3813946843) {
      if (f.below_high_3 <= -0.7302523251) {
        if (f.slope_ema_200 <= -0.0426301600) {
          if (f.dist_ema_55 <= 1.0195146986) {
            if (f.close_position <= 0.6296385892) {
              if (f.ret_34 <= 0.9659425735) {
                if (f.below_high_21 <= -1.5347342699) {
                  if (f.above_low_8 <= 1.7606446860) {
                    if (f.above_low_21 <= 1.5987270250) return 0.75;
                    else return 0.17241379;
                  } else {
                    if (f.ret_13 <= 2.0118870497) return 1.0;
                    else return 0.6;
                  }
                } else {
                  if (f.ret_2 <= -0.4174339856) return 0.0;
                  else {
                    if (f.ret_34 <= 0.1235502451) return 0.40909091;
                    else return 0.0;
                  }
                }
              } else {
                if (f.below_high_13 <= -2.1790694860) return 0.0;
                else {
                  if (f.dist_ema_89 <= -0.4655275792) {
                    if (f.ret_3 <= -0.7769873478) return 0.45454545;
                    else return 0.94117647;
                  } else {
                    if (f.ret_34 <= 2.2331546396) return 0.0;
                    else return 0.83333333;
                  }
                }
              }
            } else {
              if (f.body_lag_1 <= 0.0528486212) {
                if (f.range_atr <= 0.6251846069) {
                  if (f.above_low_8 <= 1.5215528955) return 0.0;
                  else return 0.57142857;
                } else {
                  if (f.body_lag_3 <= 0.5504370174) {
                    if (f.ret_1 <= 0.2939893562) return 0.6;
                    else return 1.0;
                  } else return 0.25;
                }
              } else {
                if (f.ret_34 <= 0.9206152107) return 1.0;
                else return 0.5;
              }
            }
          } else {
            if (f.ret_2 <= -0.3872580171) {
              if (f.ret_3 <= -0.2834467682) return 0.0;
              else return 0.6;
            } else return 0.0;
          }
        } else {
          if (f.above_low_21 <= 2.3387072684) {
            if (f.ret_13 <= 0.7110463650) {
              if (f.ret_5 <= -0.3273793897) {
                if (f.below_high_5 <= -1.3527287087) {
                  if (f.ret_3 <= -1.0214702233) return 0.2;
                  else return 0.0;
                } else {
                  if (f.above_low_21 <= 1.4985603012) return 0.75;
                  else return 0.0;
                }
              } else {
                if (f.ret_13 <= -0.0956663678) {
                  if (f.dist_ema_55 <= 1.1433064609) {
                    if (f.range_atr <= 0.6423970728) return 1.0;
                    else return 0.42105263;
                  } else return 1.0;
                } else {
                  if (f.dist_ema_21 <= -0.0612025285) return 0.66666667;
                  else {
                    if (f.above_low_21 <= 1.4439786406) return 0.6;
                    else return 0.10526316;
                  }
                }
              }
            } else {
              if (f.ret_1 <= -0.4780162564) {
                if (f.ret_3 <= -0.2329477416) return 0.0;
                else return 0.75;
              } else {
                if (f.body_lag_5 <= 0.3644269783) {
                  if (f.ret_1 <= 0.1392949358) return 1.0;
                  else return 0.83333333;
                } else return 0.5;
              }
            }
          } else {
            if (f.above_low_5 <= 1.1067116160) {
              if (f.body_lag_2 <= 0.4330784460) {
                if (f.above_low_21 <= 3.2254026115) {
                  if (f.below_high_3 <= -1.0100846398) {
                    if (f.rsi_14 <= 54.4938360155) return 0.94117647;
                    else return 0.42857143;
                  } else {
                    if (f.body_lag_1 <= -0.0058827071) return 0.11111111;
                    else return 0.71428571;
                  }
                } else {
                  if (f.slope_ema_89 <= 0.2005218795) {
                    if (f.ret_3 <= -0.3171019454) return 1.0;
                    else return 0.84210526;
                  } else {
                    if (f.ret_8 <= 0.3895813403) return 0.8;
                    else return 0.16666667;
                  }
                }
              } else {
                if (f.dist_ema_55 <= 1.2238301925) return 0.125;
                else return 0.8;
              }
            } else {
              if (f.body_lag_1 <= 0.6814177758) {
                if (f.ret_8 <= 0.8784097881) {
                  if (f.above_low_5 <= 1.4604975276) return 0.42857143;
                  else return 1.0;
                } else {
                  if (f.ret_8 <= 1.6718981084) {
                    if (f.ret_2 <= -0.4614629408) return 0.4;
                    else return 0.0;
                  } else {
                    if (f.close_position <= 0.3680414183) return 0.66666667;
                    else return 0.26086957;
                  }
                }
              } else {
                if (f.ret_3 <= 0.7083096500) return 0.4;
                else return 1.0;
              }
            }
          }
        }
      } else {
        if (f.above_low_13 <= 1.9148286616) {
          if (f.ret_5 <= -0.1978428261) {
            if (f.dist_ema_55 <= 1.5918866668) {
              if (f.ret_8 <= -0.7501981047) {
                if (f.slope_ema_21 <= -0.3190163452) return 0.4;
                else {
                  if (f.dist_ema_200 <= -0.0003673787) return 0.66666667;
                  else return 1.0;
                }
              } else {
                if (f.ret_1 <= -0.1610637772) {
                  if (f.slope_ema_34 <= 0.1418815259) return 0.0;
                  else return 0.5;
                } else {
                  if (f.close_position <= 0.8002600092) {
                    if (f.ret_3 <= 0.0614843957) return 0.92307692;
                    else return 0.5;
                  } else {
                    if (f.ret_2 <= -0.1558290145) return 0.6;
                    else return 0.0;
                  }
                }
              }
            } else return 0.11111111;
          } else {
            if (f.range_atr <= 1.0449652955) {
              if (f.ret_5 <= 0.1402336451) {
                if (f.body_lag_2 <= -0.3973757538) return 0.375;
                else {
                  if (f.ret_21 <= 1.3927749827) {
                    if (f.ret_1 <= -0.0898963447) return 0.75;
                    else return 0.97777778;
                  } else {
                    if (f.body_lag_5 <= 0.1025568240) return 0.44444444;
                    else return 1.0;
                  }
                }
              } else {
                if (f.dist_ema_89 <= -1.6142223598) {
                  if (f.range_atr <= 0.6910909357) {
                    if (f.ret_3 <= 0.6878178047) return 0.6;
                    else return 1.0;
                  } else return 0.0;
                } else {
                  if (f.slope_ema_200 <= -0.0973238304) {
                    if (f.below_high_13 <= -1.8858738534) return 1.0;
                    else return 0.68;
                  } else {
                    if (f.ret_8 <= -1.0947126039) return 0.33333333;
                    else return 0.68571429;
                  }
                }
              }
            } else {
              if (f.above_low_13 <= 1.0217340289) return 0.14285714;
              else {
                if (f.ret_3 <= 0.6625841538) {
                  if (f.body_lag_2 <= -0.0637781412) {
                    if (f.below_high_21 <= -1.1188154744) return 0.76470588;
                    else return 0.0;
                  } else return 1.0;
                } else {
                  if (f.ret_8 <= -0.4838720806) return 0.0;
                  else {
                    if (f.above_low_21 <= 1.8799141922) return 0.8;
                    else return 0.14285714;
                  }
                }
              }
            }
          }
        } else {
          if (f.slope_ema_34 <= -0.2944111864) {
            if (f.ret_13 <= 1.1631208277) {
              if (f.below_high_5 <= 0.5483161663) {
                if (f.close_position <= 0.7762448303) {
                  if (f.ret_13 <= -0.6586510836) {
                    if (f.ret_34 <= -3.1410872172) return 0.8;
                    else return 0.0;
                  } else {
                    if (f.ret_2 <= 1.4374353815) return 0.0;
                    else return 0.16666667;
                  }
                } else {
                  if (f.below_high_5 <= -0.1866506312) return 0.83333333;
                  else {
                    if (f.ret_13 <= 0.2441686159) return 0.13333333;
                    else return 0.57142857;
                  }
                }
              } else return 0.75;
            } else {
              if (f.above_low_8 <= 1.9924597502) {
                if (f.ret_1 <= 0.2977887743) return 0.8;
                else return 1.0;
              } else return 0.375;
            }
          } else {
            if (f.ret_5 <= 1.5380501666) {
              if (f.ret_34 <= -2.5424037356) {
                if (f.slope_ema_89 <= -0.0872546590) {
                  if (f.ret_21 <= -0.8120798388) {
                    if (f.slope_ema_55 <= -0.1995516467) return 0.33333333;
                    else return 1.0;
                  } else {
                    if (f.ret_13 <= 1.3639298712) return 0.35714286;
                    else return 0.0;
                  }
                } else {
                  if (f.ret_1 <= 0.2517872661) return 1.0;
                  else return 0.6;
                }
              } else {
                if (f.ret_2 <= -0.1190725156) {
                  if (f.below_high_5 <= -0.5783942115) {
                    if (f.slope_ema_34 <= 0.3182076352) return 0.6;
                    else return 0.92857143;
                  } else return 1.0;
                } else {
                  if (f.above_low_5 <= 0.7860961352) {
                    if (f.above_low_5 <= 0.7350337406) return 0.275;
                    else return 0.8;
                  } else {
                    if (f.ret_5 <= 1.3954086298) return 0.59600998;
                    else return 0.77777778;
                  }
                }
              }
            } else {
              if (f.slope_ema_89 <= -0.2097259531) {
                if (f.above_low_8 <= 2.4091702897) return 0.5;
                else {
                  if (f.body_lag_2 <= -0.0698259298) return 0.8;
                  else return 1.0;
                }
              } else {
                if (f.dist_ema_55 <= 1.9358733427) {
                  if (f.dist_ema_34 <= 1.8098707778) {
                    if (f.above_low_21 <= 3.7790573395) return 0.30263158;
                    else return 0.52941176;
                  } else {
                    if (f.ret_1 <= 0.4369492914) return 0.2;
                    else return 0.0;
                  }
                } else {
                  if (f.dist_ema_34 <= 3.1481339031) {
                    if (f.slope_ema_34 <= 0.4037274960) return 0.52;
                    else return 0.85294118;
                  } else {
                    if (f.ret_5 <= 2.9580859682) return 0.0;
                    else return 0.4;
                  }
                }
              }
            }
          }
        }
      }
    } else {
      if (f.rsi_14 <= 59.5444448965) {
        if (f.above_low_21 <= 1.6971230232) {
          if (f.below_high_21 <= -1.7520443677) {
            if (f.ret_1 <= -0.2042333951) return 1.0;
            else return 0.8;
          } else return 0.42857143;
        } else {
          if (f.slope_ema_55 <= 0.4187594494) {
            if (f.above_low_3 <= 0.3869431673) return 0.0;
            else {
              if (f.below_high_5 <= -1.1428418122) return 0.5;
              else return 0.0;
            }
          } else {
            if (f.dist_ema_200 <= 7.4712634174) {
              if (f.dist_ema_200 <= 4.6248698447) {
                if (f.close_position <= 0.1834127977) {
                  if (f.range_atr <= 0.8468338800) return 0.4;
                  else {
                    if (f.ret_1 <= -0.8193510364) return 0.8;
                    else return 1.0;
                  }
                } else {
                  if (f.ret_1 <= -0.3864829460) {
                    if (f.ret_8 <= -0.5535139964) return 0.42857143;
                    else return 0.0;
                  } else {
                    if (f.body_lag_5 <= 0.1024850071) return 0.33333333;
                    else return 0.875;
                  }
                }
              } else {
                if (f.slope_ema_21 <= 0.5129625551) {
                  if (f.ret_13 <= 0.1255168584) {
                    if (f.range_atr <= 0.8534985119) return 0.0;
                    else return 0.5;
                  } else return 0.0;
                } else {
                  if (f.dist_ema_55 <= 2.5290253353) {
                    if (f.above_low_5 <= 0.3812001792) return 0.6;
                    else return 0.0;
                  } else return 0.8;
                }
              }
            } else {
              if (f.close_position <= 0.4164659210) {
                if (f.ret_1 <= -0.3360470252) return 0.6;
                else return 0.0;
              } else {
                if (f.ret_8 <= 0.0413876215) return 0.625;
                else return 1.0;
              }
            }
          }
        }
      } else {
        if (f.above_low_3 <= 0.5327239926) {
          if (f.above_low_13 <= 3.3824562450) {
            if (f.above_low_5 <= 1.7839916291) {
              if (f.slope_ema_89 <= 0.6847558800) {
                if (f.ret_34 <= 6.9705916507) {
                  if (f.below_high_13 <= -1.2755566121) {
                    if (f.dist_ema_34 <= 1.7072992323) return 0.63636364;
                    else return 1.0;
                  } else {
                    if (f.body_lag_5 <= 0.5514247821) return 0.22727273;
                    else return 0.77777778;
                  }
                } else {
                  if (f.ret_2 <= -0.2240250426) return 1.0;
                  else return 0.8;
                }
              } else return 0.125;
            } else return 0.11111111;
          } else {
            if (f.slope_ema_21 <= 0.8136427064) return 0.16666667;
            else {
              if (f.ret_5 <= 1.2169025792) {
                if (f.below_high_13 <= -0.9539918682) {
                  if (f.ret_5 <= 0.4332731510) return 1.0;
                  else return 0.875;
                } else return 0.4;
              } else return 0.4;
            }
          }
        } else {
          if (f.ret_21 <= 3.2230610078) {
            if (f.dist_ema_89 <= 4.3526242466) {
              if (f.ret_21 <= 1.5949988751) {
                if (f.ret_8 <= 1.7671039479) {
                  if (f.ret_1 <= 0.2427813802) return 0.0;
                  else return 0.4;
                } else return 0.75;
              } else {
                if (f.slope_ema_55 <= 0.5816652126) {
                  if (f.ret_34 <= 3.9418896988) {
                    if (f.above_low_5 <= 1.5080114272) return 0.28571429;
                    else return 0.78571429;
                  } else {
                    if (f.ret_1 <= -0.0934772236) return 0.71428571;
                    else return 1.0;
                  }
                } else return 0.25;
              }
            } else {
              if (f.ret_13 <= 2.7694546562) {
                if (f.above_low_21 <= 3.3285262554) {
                  if (f.ret_8 <= 0.3945765078) return 0.55555556;
                  else {
                    if (f.ret_1 <= 0.4411849642) return 0.2;
                    else return 0.0;
                  }
                } else {
                  if (f.ret_3 <= 0.1043748094) return 0.28571429;
                  else {
                    if (f.range_atr <= 1.0835691700) return 0.94117647;
                    else return 0.5;
                  }
                }
              } else {
                if (f.ret_1 <= 0.0362850261) return 0.2;
                else return 0.0;
              }
            }
          } else {
            if (f.above_low_21 <= 6.3445838596) {
              if (f.slope_ema_21 <= 0.5917824528) {
                if (f.ret_8 <= 1.1586881123) return 0.0;
                else return 0.375;
              } else {
                if (f.above_low_21 <= 5.1961462867) {
                  if (f.dist_ema_55 <= 2.9118019382) {
                    if (f.above_low_21 <= 4.7445135923) return 0.44;
                    else return 0.0;
                  } else {
                    if (f.dist_ema_55 <= 3.3317784846) return 0.84;
                    else return 0.47457627;
                  }
                } else {
                  if (f.dist_ema_89 <= 3.6559491697) {
                    if (f.ret_34 <= 6.4748266293) return 0.78947368;
                    else return 0.0;
                  } else {
                    if (f.ret_34 <= 3.8654857848) return 0.6;
                    else return 0.18604651;
                  }
                }
              }
            } else {
              if (f.dist_ema_34 <= 4.5809272966) {
                if (f.above_low_21 <= 7.9516709639) {
                  if (f.above_low_13 <= 6.2221194526) {
                    if (f.ret_1 <= -0.0538798473) return 0.84615385;
                    else return 0.44230769;
                  } else return 1.0;
                } else {
                  if (f.ret_2 <= 0.0238942639) return 0.66666667;
                  else return 1.0;
                }
              } else {
                if (f.above_low_3 <= 3.4561366734) {
                  if (f.ret_1 <= 0.8415627237) return 0.0;
                  else return 0.33333333;
                } else return 0.77777778;
              }
            }
          }
        }
      }
    }
  }
}
