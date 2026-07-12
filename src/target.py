a = [3,2,4,6]
target = int(input("Enter the target value: "))
for i in range(len(a)):
    for j in range(i + 1, len(a)):
        if a[i] + a[j] == target:
            print(i,j)     