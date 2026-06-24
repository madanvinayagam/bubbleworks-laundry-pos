type ModulePageProps = {
  title: string;
  primaryAction?: string;
  rows?: Array<Record<string, string>>;
};

export function ModulePage({ title, primaryAction = "Add New", rows = [] }: ModulePageProps) {
  const columns = rows[0] ? Object.keys(rows[0]) : ["Name", "Status", "Updated"];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button className="focus-ring h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white">
          {primaryAction}
        </button>
      </div>
      <div className="overflow-hidden rounded-md border border-line bg-surface shadow-panel">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-[#eef3f1] text-left text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={index} className="border-t border-line">
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3">
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
