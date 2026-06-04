import React, { useState, useMemo, useCallback, useRef } from "react";
import { useSecrets, useCreateSecret, useUpdateSecret, useDeleteSecret } from "@/api/secret";
import { useProviders, useCreateProvider, useUpdateProvider, useDeleteProvider } from "@/api/provider";
import { apiUnauthorizedEvent } from "@/api/client";
import {
    Plus, Pencil, TrashBin, Copy, Eye, EyeSlash, Key, ArrowRightFromSquare,
    Check, EllipsisVertical, FolderOpen,
} from "@gravity-ui/icons";
import * as TheSvg from "@thesvg/react";
import { Modal, Button, TextField, Label, Input, TextArea, Tooltip, Spinner, Chip, ScrollShadow, Avatar, Card, ComboBox, ListBox, SearchField } from "@heroui/react";

// thesvg 图标列表（模块级，只构建一次）
const thesvgIcons = Object.keys(TheSvg).filter(k => {
    const v = TheSvg[k as keyof typeof TheSvg];
    return typeof v === "object" && v !== null && "render" in v;
}).sort();

// 渲染服务商图标：thesvg: 前缀用图标组件，URL 用 Avatar，否则用默认 Key 图标
function ProviderIcon({ avatar, name, size = 18 }: { avatar: string | null; name: string; size?: number }) {
    if (avatar?.startsWith("thesvg:")) {
        const Icon = TheSvg[avatar.slice(7) as keyof typeof TheSvg] as React.ComponentType<{ width?: number; height?: number }> | undefined;
        return Icon ? <Icon width={size} height={size} /> : <Key width={size} height={size} />;
    }
    if (avatar) {
        return <Avatar className={`h-${size / 4} w-${size / 4}`}><Avatar.Image src={avatar} /><Avatar.Fallback>{name[0]}</Avatar.Fallback></Avatar>;
    }
    return <Key width={size} height={size} />;
}

export default function MainPage() {
    // 数据
    const { data: providers = [], isLoading: lp } = useProviders();
    const { data: secrets = [], isLoading: ls } = useSecrets();
    const createP = useCreateProvider();
    const updateP = useUpdateProvider();
    const deleteP = useDeleteProvider();
    const createS = useCreateSecret();
    const updateS = useUpdateSecret();
    const deleteS = useDeleteSecret();

    // UI 状态
    const [activePid, setActivePid] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [sidebar, setSidebar] = useState(false);
    const [visible, setVisible] = useState<Set<number>>(new Set());
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout>>(null);

    // Provider 弹窗
    const [pOpen, setPOpen] = useState(false);
    const [editP, setEditP] = useState<{ id: number; name: string; avatar: string } | null>(null);
    const [pName, setPName] = useState("");
    const [pAvatar, setPAvatar] = useState("");
    const [iconQuery, setIconQuery] = useState("");
    const filteredIcons = useMemo(() => {
        const q = iconQuery.trim().toLowerCase();
        if (!q) return ["Google", "Github", "Cloudflare", "Microsoft"];
        return thesvgIcons
            .filter(n => n.toLowerCase().includes(q))
            .sort((a, b) => {
                const al = a.toLowerCase(), bl = b.toLowerCase();
                const aStarts = al.startsWith(q), bStarts = bl.startsWith(q);
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
                return al.localeCompare(bl);
            })
            .slice(0, 4);
    }, [iconQuery]);

    // Secret 弹窗
    const [sOpen, setSOpen] = useState(false);
    const [editS, setEditS] = useState<{ id: number; name: string; value: string; remark: string; providerId: number } | null>(null);
    const [sName, setSName] = useState("");
    const [sValue, setSValue] = useState("");
    const [sRemark, setSRemark] = useState("");
    const [sPid, setSPid] = useState(0);

    // 删除确认
    const [del, setDel] = useState<{ type: "provider" | "secret"; id: number; name: string } | null>(null);

    // 派生数据
    const pidMap = useMemo(() => new Map(providers.map(p => [p.id, p.name])), [providers]);
    const providerMap = useMemo(() => new Map(providers.map(p => [p.id, p])), [providers]);
    const filtered = useMemo(() => {
        let list = secrets;
        if (activePid !== null) list = list.filter(s => s.providerId === activePid);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q) || (s.remark ?? "").toLowerCase().includes(q));
        }
        return list;
    }, [secrets, activePid, search]);

    // 操作
    const markCopied = useCallback((id: number) => {
        setCopiedId(id);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
    }, []);

    const openCreateP = () => { setEditP(null); setPName(""); setPAvatar(""); setIconQuery(""); setPOpen(true); setSidebar(false); };
    const openEditP = (p: { id: number; name: string; avatar: string | null }) => { setEditP({ id: p.id, name: p.name, avatar: p.avatar ?? "" }); setPName(p.name); setPAvatar(p.avatar ?? ""); setIconQuery(p.avatar?.startsWith("thesvg:") ? p.avatar.slice(7) : ""); setPOpen(true); setSidebar(false); };
    const openCreateS = () => { setEditS(null); setSName(""); setSValue(""); setSRemark(""); setSPid(activePid ?? 0); setSOpen(true); };
    const openEditS = (s: { id: number; name: string; value: string; remark: string | null; providerId: number }) => { setEditS({ ...s, remark: s.remark ?? "" }); setSName(s.name); setSValue(s.value); setSRemark(s.remark ?? ""); setSPid(s.providerId); setSOpen(true); };

    const submitP = async () => {
        const name = pName.trim();
        if (!name) return;
        try {
            if (editP) { await updateP.mutateAsync({ id: editP.id, name, avatar: pAvatar || undefined }); }
            else { await createP.mutateAsync({ name, avatar: pAvatar || undefined }); }
            setPOpen(false);
        } catch { /* 静默处理 */ }
    };

    const submitS = async () => {
        const name = sName.trim();
        const value = sValue.trim();
        if (!name || !value || !sPid) return;
        try {
            if (editS) { await updateS.mutateAsync({ id: editS.id, name, value, remark: sRemark || undefined, providerId: sPid }); }
            else { await createS.mutateAsync({ providerId: sPid, name, value, remark: sRemark || undefined }); }
            setSOpen(false);
        } catch { /* 静默处理 */ }
    };

    const doDelete = async () => {
        if (!del) return;
        try {
            if (del.type === "provider") { await deleteP.mutateAsync(del.id); if (activePid === del.id) setActivePid(null); }
            else { await deleteS.mutateAsync(del.id); }
            setDel(null);
        } catch { /* 静默处理 */ }
    };

    const copy = async (id: number, value: string) => { try { await navigator.clipboard.writeText(value); markCopied(id); } catch { /* 静默处理 */ } };
    const toggleVis = (id: number) => setVisible(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
    const logout = () => window.dispatchEvent(new Event(apiUnauthorizedEvent));

    if (lp || ls) return <div className="flex h-svh items-center justify-center bg-background"><Spinner /></div>;

    return (
        <div className="flex h-svh bg-background text-foreground">

            {sidebar && <div className="fixed inset-0 z-30 bg-overlay/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebar(false)} />}

            {/* Sidebar */}
            <aside className={`${sidebar ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col bg-background shadow-lg transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none`}>
                <div className="flex h-16 items-center px-4 gap-2.5">
                    <img src="/favicon.svg" width={28} height={28} alt="WSecret" />
                    <span className="text-xl font-bold tracking-tight">WSecret</span>
                </div>

                <ScrollShadow className="flex-1 space-y-0.5 px-2 py-1">
                    <button onClick={() => { setActivePid(null); setSidebar(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activePid === null ? "bg-border" : "text-foreground hover:bg-default"}`}>
                        <FolderOpen width={18} height={18} /> 全部密钥 <span className="ml-auto text-xs text-muted">{secrets.length}</span>
                    </button>
                    {providers.map(p => (
                        <div key={p.id} className="group relative">
                            <button onClick={() => { setActivePid(p.id); setSidebar(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activePid === p.id ? "bg-border" : "text-foreground hover:bg-default"}`}>
                                <ProviderIcon avatar={p.avatar} name={p.name} />
                                <span className="truncate">{p.name}</span>
                                <span className="ml-auto text-xs text-muted">{secrets.filter(s => s.providerId === p.id).length}</span>
                            </button>
                            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-surface/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                                <button onClick={e => { e.stopPropagation(); openEditP(p); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-default hover:text-foreground"><Pencil width={14} height={14} /></button>
                                <button onClick={e => { e.stopPropagation(); setDel({ type: "provider", id: p.id, name: p.name }); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"><TrashBin width={14} height={14} /></button>
                            </div>
                        </div>
                    ))}
                </ScrollShadow>

                <div className="p-2">
                    <button onClick={openCreateP} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-default">
                        <Plus width={18} height={18} /> 添加服务商
                    </button>
                    <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-default">
                        <ArrowRightFromSquare width={18} height={18} /> 退出登录
                    </button>
                </div>
            </aside>

            {/* Main */}
            <ScrollShadow className="relative flex-1 flex flex-col">
                <div className="flex h-16 items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebar(true)} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-default lg:hidden">
                            <EllipsisVertical width={20} height={20} />
                        </button>
                        <h2 className="text-lg font-semibold">{activePid !== null ? (pidMap.get(activePid) ?? "未知服务商") : "全部密钥"}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <SearchField.Root value={search} onChange={setSearch} variant="secondary" className="h-9">
                            <SearchField.Group>
                                <SearchField.SearchIcon className="text-muted" />
                                <SearchField.Input placeholder="搜索密钥..." className="w-40 lg:w-56" />
                                <SearchField.ClearButton />
                            </SearchField.Group>
                        </SearchField.Root>
                        <Button variant="primary" onPress={openCreateS} isDisabled={providers.length === 0} className="h-9"><Plus width={16} height={16} /> 新增密钥</Button>
                    </div>
                </div>
                <div className="flex flex-1 flex-col px-4 pb-6 lg:px-8">
                    {filtered.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center text-muted">
                            <Key width={48} height={48} className="mb-4 opacity-30" />
                            <p className="text-sm font-medium">{search ? "没有找到匹配的密钥" : providers.length === 0 ? "请先添加服务商" : "暂无密钥"}</p>
                            {!search && providers.length > 0 && <Button variant="ghost" onPress={openCreateS} className="mt-3">点击添加第一个密钥</Button>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filtered.map(s => {
                                const vis = visible.has(s.id);
                                const copied = copiedId === s.id;
                                return (
                                    <Card.Root key={s.id} className="group">
                                        <Card.Header className="flex-row items-center justify-between gap-2 pb-0">
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <Card.Title className="truncate text-base font-medium">{s.name}</Card.Title>
                                                {activePid === null && (() => { const p = providerMap.get(s.providerId); return p ? <Chip size="sm" variant="soft"><ProviderIcon avatar={p.avatar} name={p.name} size={14} /><Chip.Label>{p.name}</Chip.Label></Chip> : null; })()}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-0.5">
                                                <Tooltip><Tooltip.Trigger><Button isIconOnly size="sm" variant="ghost" onPress={() => openEditS(s)}><Pencil width={14} height={14} /></Button></Tooltip.Trigger><Tooltip.Content>编辑</Tooltip.Content></Tooltip>
                                                <Tooltip><Tooltip.Trigger><Button isIconOnly size="sm" variant="ghost" className="hover:bg-danger/10 hover:text-danger" onPress={() => setDel({ type: "secret", id: s.id, name: s.name })}><TrashBin width={14} height={14} /></Button></Tooltip.Trigger><Tooltip.Content>删除</Tooltip.Content></Tooltip>
                                            </div>
                                        </Card.Header>
                                        <Card.Content className="pt-0">
                                            <div className="flex items-center gap-2 rounded-lg bg-default px-3 py-2">
                                                <code className="min-w-0 flex-1 truncate font-mono text-sm text-field-foreground">{vis ? s.value : "•".repeat(Math.min(s.value.length, 24))}</code>
                                                <button onClick={() => toggleVis(s.id)} className="shrink-0 text-muted hover:text-foreground">{vis ? <EyeSlash width={16} height={16} /> : <Eye width={16} height={16} />}</button>
                                                <button onClick={() => copy(s.id, s.value)} className="shrink-0 text-muted hover:text-foreground">{copied ? <Check width={16} height={16} className="text-success" /> : <Copy width={16} height={16} />}</button>
                                            </div>
                                            {s.remark && <p className="mt-2 line-clamp-2 text-xs text-muted">{s.remark}</p>}
                                        </Card.Content>
                                    </Card.Root>
                                );
                            })}
                        </div>
                    )}
                </div>
            </ScrollShadow>

            {/* Provider 弹窗 */}
            <Modal isOpen={pOpen} onOpenChange={setPOpen}>
                <Modal.Backdrop>
                    <Modal.Container>
                        <Modal.Dialog>
                            <Modal.CloseTrigger />
                            <Modal.Header><Modal.Heading>{editP ? "编辑服务商" : "新增服务商"}</Modal.Heading></Modal.Header>
                            <Modal.Body>
                                <TextField autoFocus value={pName} onChange={setPName} className="mb-4" variant="secondary">
                                    <Label>名称</Label>
                                    <Input placeholder="例如：GitHub、AWS" />
                                </TextField>
                                <ComboBox variant="secondary" className="mb-4" allowsEmptyCollection inputValue={iconQuery} onInputChange={setIconQuery} value={pAvatar.startsWith("thesvg:") ? pAvatar.slice(7) : null} onChange={key => { if (key) { setPAvatar(`thesvg:${key}`); setIconQuery(String(key)); } }}>
                                    <Label className="mb-1.5 block text-sm font-medium">品牌图标</Label>
                                    <ComboBox.InputGroup>
                                        <Input placeholder="搜索品牌图标..." />
                                        <ComboBox.Trigger />
                                    </ComboBox.InputGroup>
                                    <ComboBox.Popover className="w-64">
                                        <ListBox>
                                            {filteredIcons.map(name => {
                                                const Icon = TheSvg[name as keyof typeof TheSvg] as React.ComponentType<{ width?: number; height?: number }>;
                                                return (
                                                    <ListBox.Item key={name} id={name} textValue={name}>
                                                        <Icon width={18} height={18} />
                                                        <span className="truncate text-sm">{name}</span>
                                                    </ListBox.Item>
                                                );
                                            })}
                                        </ListBox>
                                    </ComboBox.Popover>
                                </ComboBox>
                                <TextField value={pAvatar.startsWith("thesvg:") ? "" : pAvatar} onChange={setPAvatar} variant="secondary">
                                    <Label>自定义图标 URL（可选）</Label>
                                    <Input placeholder="https://..." />
                                </TextField>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="primary" onPress={submitP} isDisabled={!pName.trim() || createP.isPending || updateP.isPending}>
                                    {createP.isPending || updateP.isPending ? <Spinner className="h-4 w-4" /> : editP ? "保存" : "创建"}
                                </Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>

            {/* Secret 弹窗 */}
            <Modal isOpen={sOpen} onOpenChange={setSOpen}>
                <Modal.Backdrop>
                    <Modal.Container>
                        <Modal.Dialog>
                            <Modal.Header><Modal.Heading>{editS ? "编辑密钥" : "新增密钥"}</Modal.Heading></Modal.Header>
                            <Modal.Body>
                                {!editS && activePid === null && (
                                    <ComboBox.Root variant="secondary" className="mb-4" selectedKey={sPid || null} onSelectionChange={key => setSPid(Number(key))}>
                                        <Label className="mb-1.5 block text-sm font-medium">服务商</Label>
                                        <ComboBox.InputGroup>
                                            <Input placeholder="选择服务商" />
                                            <ComboBox.Trigger />
                                        </ComboBox.InputGroup>
                                        <ComboBox.Popover>
                                            <ListBox.Root items={providers}>
                                                {item => <ListBox.Item id={item.id} textValue={item.name}><ProviderIcon avatar={item.avatar} name={item.name} /><span className="truncate">{item.name}</span></ListBox.Item>}
                                            </ListBox.Root>
                                        </ComboBox.Popover>
                                    </ComboBox.Root>
                                )}
                                <TextField autoFocus value={sName} onChange={setSName} className="mb-4" variant="secondary">
                                    <Label>名称</Label>
                                    <Input placeholder="例如：API Key、Access Token" />
                                </TextField>
                                <TextField value={sValue} onChange={setSValue} className="mb-4" variant="secondary">
                                    <Label>密钥值</Label>
                                    <Input placeholder="粘贴密钥..." className="font-mono" />
                                </TextField>
                                <TextField value={sRemark} onChange={setSRemark} variant="secondary">
                                    <Label>备注（可选）</Label>
                                    <TextArea placeholder="添加备注..." rows={3} />
                                </TextField>
                            </Modal.Body>
                            <Modal.Footer>
                                <Modal.CloseTrigger />
                                <Button variant="primary" onPress={submitS} isDisabled={!sName.trim() || !sValue.trim() || createS.isPending || updateS.isPending}>
                                    {createS.isPending || updateS.isPending ? <Spinner className="h-4 w-4" /> : editS ? "保存" : "创建"}
                                </Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>

            {/* 删除确认 */}
            <Modal isOpen={!!del} onOpenChange={open => { if (!open) setDel(null); }}>
                <Modal.Backdrop>
                    <Modal.Container>
                        <Modal.Dialog>
                            <Modal.Header><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
                            <Modal.Body>
                                <p className="text-sm">
                                    确定要删除{del?.type === "provider" ? "服务商" : "密钥"}「<span className="font-semibold">{del?.name}</span>」吗？
                                    {del?.type === "provider" && <span className="mt-2 block text-danger">该操作将同时删除该服务商下的所有密钥。</span>}
                                </p>
                            </Modal.Body>
                            <Modal.Footer>
                                <Modal.CloseTrigger />
                                <Button variant="danger" onPress={doDelete} isDisabled={deleteP.isPending || deleteS.isPending}>
                                    {deleteP.isPending || deleteS.isPending ? <Spinner className="h-4 w-4" /> : "删除"}
                                </Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </div>
    );
}
