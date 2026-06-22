import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLeadProductionStore } from '@/store/leadProductionStore';
import {
  createEmptyLeadProductionSheet,
  type LeadProductionGroup,
  type LeadProductionItem,
  type LeadProductionSheet,
} from '@/api/leadProductionApi';
import type { Lead } from '@/api/leadApi';
import { Loader2, Plus, Save, Download, Trash2 } from 'lucide-react';
import { downloadProductionPdf } from '@/services/productionPdfService';

interface ProductionTableProps {
  lead: Lead;
}

const createEmptyItem = (): LeadProductionItem => ({
  name: '',
  preProductionQuantity: '',
  postProductionQuantity: '',
});

const DEFAULT_PRODUCTION_NAMES = [
  'Tent supply',
  'Tent Worker',
  'Tent Labour',
  'Flowers',
  'Florist',
  'Purchase',
  'New makings',
  'Light',
  'Sound',
  'Flex & Print',
  'Misc.',
  'DG & Fuel',
  'Dj player',
  'Anchor',
];

const createEmptyGroup = (name = ''): LeadProductionGroup => ({
  name,
  items: [createEmptyItem()],
});

const createDefaultProductionGroups = (): LeadProductionGroup[] =>
  DEFAULT_PRODUCTION_NAMES.map((name) => createEmptyGroup(name));

const ensureRenderableSheet = (sheet: LeadProductionSheet): LeadProductionSheet => ({
  ...sheet,
  productions:
    sheet.productions.length > 0
      ? sheet.productions.map((group) => ({
        ...group,
        items: group.items.length > 0 ? group.items : [createEmptyItem()],
      }))
      : createDefaultProductionGroups(),
});

const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value;
};

const toPayload = (sheet: LeadProductionSheet) => ({
  dates: {
    productionDate: sheet.dates.productionDate || null,
    preProductionDate: sheet.dates.preProductionDate || null,
    postProductionDate: sheet.dates.postProductionDate || null,
  },
  productions: sheet.productions.map((group) => ({
    _id: group._id,
    name: group.name,
    items: group.items.map((item) => ({
      _id: item._id,
      name: item.name,
      preProductionQuantity: item.preProductionQuantity,
      postProductionQuantity: item.postProductionQuantity,
    })),
  })),
});

const softInputClassName =
  'border-2 border-gray-200 bg-background transition-colors focus-visible:border-gray-300 focus-visible:ring-0';

export function ProductionTable({ lead }: ProductionTableProps) {
  const {
    selectedSheet,
    loading,
    saving,
    fetchLeadProduction,
    saveLeadProduction,
    reset,
  } = useLeadProductionStore();
  const [sheet, setSheet] = useState<LeadProductionSheet>(createEmptyLeadProductionSheet(lead._id));
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const sheetRef = useRef(sheet);

  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);

  useEffect(() => {
    if (!['converted', 'completed'].includes(lead.status)) {
      reset();
      return;
    }

    let mounted = true;

    const load = async () => {
      const result = await fetchLeadProduction(lead._id);
      if (!mounted) return;

      const nextSheet = ensureRenderableSheet(result ?? createEmptyLeadProductionSheet(lead._id));
      setSheet(nextSheet);
      sheetRef.current = nextSheet;
    };

    load();

    return () => {
      mounted = false;
    };
  }, [fetchLeadProduction, lead._id, lead.status, reset]);

  useEffect(() => {
    if (!selectedSheet || selectedSheet.leadId !== lead._id) return;

    const nextSheet = ensureRenderableSheet(selectedSheet);
    setSheet(nextSheet);
    sheetRef.current = nextSheet;
  }, [selectedSheet, lead._id]);

  const setLocalSheet = (updater: (current: LeadProductionSheet) => LeadProductionSheet) => {
    setSheet((current) => {
      const next = updater(current);
      sheetRef.current = next;
      return next;
    });
  };

  const persistSheet = async (nextSheet?: LeadProductionSheet) => {
    const sheetToSave = nextSheet ?? sheetRef.current;
    const saved = await saveLeadProduction(lead._id, toPayload(sheetToSave));

    if (saved) {
      const normalized = ensureRenderableSheet(saved);
      setSheet(normalized);
      sheetRef.current = normalized;
    }
  };

  const updateDate = (field: keyof LeadProductionSheet['dates'], value: string) => {
    setLocalSheet((current) => ({
      ...current,
      dates: {
        ...current.dates,
        [field]: value || null,
      },
    }));
  };

  const updateGroupName = (groupIndex: number, value: string) => {
    setLocalSheet((current) => ({
      ...current,
      productions: current.productions.map((group, index) =>
        index === groupIndex ? { ...group, name: value } : group
      ),
    }));
  };

  const updateItemField = (
    groupIndex: number,
    itemIndex: number,
    field: keyof LeadProductionItem,
    value: string
  ) => {
    setLocalSheet((current) => ({
      ...current,
      productions: current.productions.map((group, gIndex) => {
        if (gIndex !== groupIndex) return group;

        return {
          ...group,
          items: group.items.map((item, iIndex) =>
            iIndex === itemIndex ? { ...item, [field]: value } : item
          ),
        };
      }),
    }));
  };

  const addProduction = async () => {
    const nextSheet = {
      ...sheetRef.current,
      productions: [...sheetRef.current.productions, createEmptyGroup()],
    };
    setSheet(nextSheet);
    sheetRef.current = nextSheet;
    await persistSheet(nextSheet);
  };

  const removeProduction = async (groupIndex: number) => {
    const nextSheet = {
      ...sheetRef.current,
      productions: sheetRef.current.productions.filter((_, index) => index !== groupIndex),
    };
    setSheet(nextSheet);
    sheetRef.current = nextSheet;
    await persistSheet(nextSheet);
  };

  const addItem = async (groupIndex: number) => {
    const nextSheet = {
      ...sheetRef.current,
      productions: sheetRef.current.productions.map((group, index) =>
        index === groupIndex
          ? { ...group, items: [...group.items, createEmptyItem()] }
          : group
      ),
    };
    setSheet(nextSheet);
    sheetRef.current = nextSheet;
    await persistSheet(nextSheet);
  };

  const removeItem = async (groupIndex: number, itemIndex: number) => {
    const nextSheet = {
      ...sheetRef.current,
      productions: sheetRef.current.productions.map((group, index) => {
        if (index !== groupIndex) return group;

        const nextItems = group.items.filter((_, itemIdx) => itemIdx !== itemIndex);
        return {
          ...group,
          items: nextItems.length > 0 ? nextItems : [createEmptyItem()],
        };
      }),
    };
    setSheet(nextSheet);
    sheetRef.current = nextSheet;
    await persistSheet(nextSheet);
  };

  const groupedRows = useMemo(() => {
    return sheet.productions.map((group) => ({
      ...group,
      items: group.items.length > 0 ? group.items : [createEmptyItem()],
    }));
  }, [sheet]);

  const handleDownloadPdf = async () => {
    try {
      setPdfGenerating(true);
      await downloadProductionPdf({
        lead,
        sheet: sheetRef.current,
      });
    } catch (error) {
      console.error('Failed to generate production PDF:', error);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (!['converted', 'completed'].includes(lead.status)) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Production</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Production</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDownloadPdf}
          disabled={pdfGenerating}
        >
          {pdfGenerating ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1 h-4 w-4" />
          )}
          Download PDF
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="min-w-[980px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%]">Production</TableHead>
                  <TableHead className="w-[38%]">Pre-Production</TableHead>
                  <TableHead className="w-[38%]">Post-Production</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/20">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Date</p>
                      <Input
                        type="date"
                        value={toDateInputValue(sheet.dates.productionDate)}
                        onChange={(e) => updateDate('productionDate', e.target.value)}
                        className={softInputClassName}
                        disabled={saving}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Date</p>
                      <Input
                        type="date"
                        value={toDateInputValue(sheet.dates.preProductionDate)}
                        onChange={(e) => updateDate('preProductionDate', e.target.value)}
                        className={softInputClassName}
                        disabled={saving}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Date</p>
                      <Input
                        type="date"
                        value={toDateInputValue(sheet.dates.postProductionDate)}
                        onChange={(e) => updateDate('postProductionDate', e.target.value)}
                        className={softInputClassName}
                        disabled={saving}
                      />
                    </div>
                  </TableCell>
                </TableRow>

                {groupedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Add a production row to start planning pre-production and post-production work.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedRows.map((group, groupIndex) =>
                    group.items.map((item, itemIndex) => (
                      <TableRow
                        key={item._id ?? `${groupIndex}-${itemIndex}`}
                        className={itemIndex === group.items.length - 1 ? '' : 'border-b-0'}
                      >
                        {itemIndex === 0 && (
                          <TableCell rowSpan={group.items.length} className="align-top">
                            <div className="flex items-center gap-2">
                              <Input
                                value={group.name}
                                onChange={(e) => updateGroupName(groupIndex, e.target.value)}
                                placeholder="Production name"
                                className={softInputClassName}
                                disabled={saving}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => addItem(groupIndex)}
                                disabled={saving}
                                className="h-9 w-9 shrink-0 px-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeProduction(groupIndex)}
                                disabled={saving}
                                className="h-8 w-8 shrink-0"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}

                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItemField(groupIndex, itemIndex, 'name', e.target.value)}
                              placeholder="Name"
                              className={`min-w-0 flex-[1.6] ${softInputClassName}`}
                              disabled={saving}
                            />
                            <Input
                              value={item.preProductionQuantity}
                              onChange={(e) => updateItemField(groupIndex, itemIndex, 'preProductionQuantity', e.target.value)}
                              placeholder="Qty"
                              className={`w-24 min-w-[5.5rem] ${softInputClassName}`}
                              disabled={saving}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.name}
                              readOnly
                              placeholder="Name"
                              className={`min-w-0 flex-[1.6] bg-muted/40 ${softInputClassName}`}
                              disabled={saving}
                            />
                            <Input
                              value={item.postProductionQuantity}
                              onChange={(e) => updateItemField(groupIndex, itemIndex, 'postProductionQuantity', e.target.value)}
                              placeholder="Qty"
                              className={`w-24 min-w-[5.5rem] ${softInputClassName}`}
                              disabled={saving}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItem(groupIndex, itemIndex)}
                              disabled={saving}
                              className="h-8 w-8 shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button type="button" size="sm" variant="outline" onClick={addProduction} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            Add Production
          </Button>
          <Button type="button" size="sm" onClick={() => persistSheet()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
